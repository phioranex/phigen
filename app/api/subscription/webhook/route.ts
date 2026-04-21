import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

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

interface RazorpayWebhookEvent {
  event: string;
  payload: {
    subscription: {
      entity: {
        id: string;
        customer_id: string;
        status: string;
        current_end: number;
      };
    };
  };
}

async function handleRazorpayEvent(event: RazorpayWebhookEvent) {
  const sub = event.payload?.subscription?.entity;
  if (!sub) return;

  if (
    event.event === "subscription.activated" ||
    event.event === "subscription.charged"
  ) {
    // Razorpay sends customer_id — map to our userId via githubId or stored razorpaySubId
    // Best approach: look up by razorpaySubId (set at create time via separate flow)
    // For webhook-first activation, match by razorpaySubId
    await prisma.subscription.upsert({
      where: { razorpaySubId: sub.id },
      update: {
        status: "active",
        currentPeriodEnd: new Date(sub.current_end * 1000),
      },
      create: {
        // Fallback: won't have userId — handled in payment success callback instead
        userId: sub.customer_id,
        razorpaySubId: sub.id,
        status: "active",
        currentPeriodEnd: new Date(sub.current_end * 1000),
      },
    });

    // Upgrade user plan
    const dbSub = await prisma.subscription.findUnique({
      where: { razorpaySubId: sub.id },
    });
    if (dbSub) {
      await prisma.user.update({
        where: { id: dbSub.userId },
        data: { plan: "PRO" },
      });
    }
  }

  if (
    event.event === "subscription.cancelled" ||
    event.event === "subscription.expired"
  ) {
    const dbSub = await prisma.subscription.findUnique({
      where: { razorpaySubId: sub.id },
    });
    if (dbSub) {
      await prisma.subscription.update({
        where: { razorpaySubId: sub.id },
        data: { status: event.event === "subscription.expired" ? "expired" : "cancelled" },
      });
      await prisma.user.update({
        where: { id: dbSub.userId },
        data: { plan: "FREE" },
      });
    }
  }
}
