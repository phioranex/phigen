import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRazorpay, getStripe } from "@/lib/payments";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { provider } = await req.json(); // "razorpay" | "stripe"

  if (provider === "razorpay") {
    const sub = await getRazorpay().subscriptions.create({
      plan_id: process.env.RAZORPAY_PLAN_ID!,
      customer_notify: 1,
      total_count: 12,
    });

    return NextResponse.json({ subscriptionId: sub.id, provider: "razorpay" });
  }

  if (provider === "stripe") {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });

    const customer = await getStripe().customers.create({
      email: user?.email ?? undefined,
    });

    const sub = await getStripe().subscriptions.create({
      customer: customer.id,
      items: [{ price: process.env.STRIPE_PRICE_ID! }],
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    });

    return NextResponse.json({ subscriptionId: sub.id, provider: "stripe" });
  }

  return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
}
