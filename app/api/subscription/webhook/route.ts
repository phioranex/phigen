import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/payments";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  const stripeSignature = req.headers.get("stripe-signature");

  if (signature) {
    // Razorpay webhook
    const expectedSig = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSig !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);
    await handleRazorpayEvent(event);
    return NextResponse.json({ ok: true });
  }

  if (stripeSignature) {
    // Stripe webhook
    let event;
    try {
      event = getStripe().webhooks.constructEvent(
        body,
        stripeSignature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    await handleStripeEvent(event as unknown as StripeSubEvent);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
}

async function handleRazorpayEvent(event: { event: string; payload: { subscription: { entity: { id: string; customer_id: string; status: string; current_end: number } } } }) {
  const sub = event.payload?.subscription?.entity;
  if (!sub) return;

  if (event.event === "subscription.activated" || event.event === "subscription.charged") {
    await prisma.user.updateMany({
      where: { id: sub.customer_id },
      data: { plan: "PRO" },
    });

    await prisma.subscription.upsert({
      where: { userId: sub.customer_id },
      update: {
        status: sub.status,
        currentPeriodEnd: new Date(sub.current_end * 1000),
        razorpaySubId: sub.id,
      },
      create: {
        userId: sub.customer_id,
        razorpaySubId: sub.id,
        status: sub.status,
        currentPeriodEnd: new Date(sub.current_end * 1000),
      },
    });
  }

  if (event.event === "subscription.cancelled" || event.event === "subscription.expired") {
    await prisma.user.updateMany({
      where: { id: sub.customer_id },
      data: { plan: "FREE" },
    });
  }
}

interface StripeSubEvent {
  type: string;
  data: { object: { id: string; customer: string; status: string; current_period_end: number } };
}

async function handleStripeEvent(event: StripeSubEvent) {
  const sub = event.data.object;

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
    const user = await prisma.user.findFirst({
      where: {},
    });

    if (!user) return;

    const isActive = sub.status === "active";

    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: {
        status: sub.status,
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        stripeSubId: sub.id,
      },
      create: {
        userId: user.id,
        stripeSubId: sub.id,
        status: sub.status,
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { plan: isActive ? "PRO" : "FREE" },
    });
  }
}
