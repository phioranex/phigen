import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      email: true,
      avatarUrl: true,
      plan: true,
      createdAt: true,
      subscription: {
        select: { status: true, currentPeriodEnd: true },
      },
      changelogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          repoName: true,
          repoOwner: true,
          shareToken: true,
          createdAt: true,
          isPrivate: true,
        },
      },
    },
  });

  return NextResponse.json(user);
}
