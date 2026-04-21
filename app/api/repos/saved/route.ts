import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Add a saved repo
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { repoOwner, repoName, isPrivate } = await req.json();

  if (!repoOwner || !repoName) {
    return NextResponse.json({ error: "repoOwner and repoName required" }, { status: 400 });
  }

  if (isPrivate) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true },
    });

    if (user?.plan === "FREE") {
      const existingPrivate = await prisma.savedRepo.count({
        where: { userId: session.user.id, isPrivate: true },
      });

      if (existingPrivate >= 1) {
        return NextResponse.json(
          { error: "Free plan allows only 1 private repo. Upgrade to Pro." },
          { status: 403 }
        );
      }
    }
  }

  const repo = await prisma.savedRepo.upsert({
    where: {
      userId_repoOwner_repoName: {
        userId: session.user.id,
        repoOwner,
        repoName,
      },
    },
    update: {},
    create: {
      userId: session.user.id,
      repoOwner,
      repoName,
      isPrivate: isPrivate ?? false,
    },
  });

  return NextResponse.json(repo);
}

// Remove a saved repo
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { repoOwner, repoName } = await req.json();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true },
  });

  // Check if it's a private repo — free users can't remove private repos
  const repo = await prisma.savedRepo.findUnique({
    where: {
      userId_repoOwner_repoName: {
        userId: session.user.id,
        repoOwner,
        repoName,
      },
    },
  });

  if (repo?.isPrivate && user?.plan === "FREE") {
    return NextResponse.json(
      { error: "Free plan users cannot remove private repos." },
      { status: 403 }
    );
  }

  await prisma.savedRepo.deleteMany({
    where: { userId: session.user.id, repoOwner, repoName },
  });

  return NextResponse.json({ ok: true });
}
