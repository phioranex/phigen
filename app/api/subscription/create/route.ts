import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRazorpay } from "@/lib/payments";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await getRazorpay().subscriptions.create({
    plan_id: process.env.RAZORPAY_PLAN_ID!,
    customer_notify: 1,
    total_count: 12,
  });

  return NextResponse.json({ subscriptionId: sub.id });
}
