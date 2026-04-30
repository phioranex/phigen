import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRazorpay } from "@/lib/payments";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  if (!sub || sub.status !== "active") {
    return NextResponse.json({ error: "No active subscription" }, { status: 400 });
  }

  try {
    if (sub.razorpaySubId) {
      await getRazorpay().subscriptions.cancel(sub.razorpaySubId, false);
    }

    await prisma.subscription.update({
      where: { userId: session.user.id },
      data: { status: "cancelled" },
    });

    // Downgrade immediately — don't rely solely on webhook firing
    await prisma.user.update({
      where: { id: session.user.id },
      data: { plan: "FREE" },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Cancel error:", err);
    return NextResponse.json({ error: "Cancellation failed" }, { status: 500 });
  }
}
