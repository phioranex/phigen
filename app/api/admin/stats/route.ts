import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.plan)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    totalUsers,
    proUsers,
    adminUsers,
    totalChangelogs,
    totalSavedRepos,
    recentUsers,
    recentChangelogs,
    activeSubscriptions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { plan: "PRO" } }),
    prisma.user.count({ where: { plan: "ADMIN" } }),
    prisma.changelog.count(),
    prisma.savedRepo.count(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        plan: true,
        createdAt: true,
        _count: { select: { changelogs: true, savedRepos: true } },
      },
    }),
    prisma.changelog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        repoOwner: true,
        repoName: true,
        isPrivate: true,
        shareToken: true,
        createdAt: true,
        user: { select: { username: true, avatarUrl: true } },
      },
    }),
    prisma.subscription.count({ where: { status: "active" } }),
  ]);

  return NextResponse.json({
    stats: {
      totalUsers,
      proUsers,
      adminUsers,
      freeUsers: totalUsers - proUsers - adminUsers,
      totalChangelogs,
      totalSavedRepos,
      activeSubscriptions,
    },
    recentUsers,
    recentChangelogs,
  });
}
