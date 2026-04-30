import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPro } from "@/lib/admin";

// Add a saved repo
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { repoOwner, repoName } = await req.json();

  if (!repoOwner || !repoName) {
    return NextResponse.json({ error: "repoOwner and repoName required" }, { status: 400 });
  }

  // Verify repo existence + actual isPrivate from GitHub — never trust client
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true, accessToken: true },
  });

  const ghRes = await fetch(
    `https://api.github.com/repos/${repoOwner}/${repoName}`,
    {
      headers: {
        Authorization: `Bearer ${user?.accessToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!ghRes.ok) {
    return NextResponse.json({ error: "Repository not found or inaccessible" }, { status: 404 });
  }

  const ghRepo = await ghRes.json();
  const isPrivate: boolean = ghRepo.private; // authoritative — from GitHub

  if (isPrivate && !hasPro(user?.plan ?? "FREE")) {
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

  const repo = await prisma.savedRepo.upsert({
    where: {
      userId_repoOwner_repoName: {
        userId: session.user.id,
        repoOwner,
        repoName,
      },
    },
    update: { isPrivate },
    create: {
      userId: session.user.id,
      repoOwner,
      repoName,
      isPrivate,
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

  const repo = await prisma.savedRepo.findUnique({
    where: {
      userId_repoOwner_repoName: {
        userId: session.user.id,
        repoOwner,
        repoName,
      },
    },
  });

  if (repo?.isPrivate && !hasPro(user?.plan ?? "FREE")) {
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
