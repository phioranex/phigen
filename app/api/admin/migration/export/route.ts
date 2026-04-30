import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Protected by MIGRATION_SECRET env var only — no session required
// (called server-to-server from the new server's admin panel)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  const resource = searchParams.get("resource") ?? "ping";

  const migrationSecret = process.env.MIGRATION_SECRET;

  if (!migrationSecret) {
    return NextResponse.json(
      { error: "Migration not enabled on this server. Set MIGRATION_SECRET env var." },
      { status: 403 }
    );
  }

  if (secret !== migrationSecret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
  }

  // ── Ping / count check ──────────────────────────────────────────────────────
  if (resource === "ping") {
    const [users, savedRepos, changelogs, subscriptions] = await Promise.all([
      prisma.user.count(),
      prisma.savedRepo.count(),
      prisma.changelog.count(),
      prisma.subscription.count(),
    ]);
    return NextResponse.json({
      ok: true,
      counts: { users, savedRepos, changelogs, subscriptions },
    });
  }

  // ── Users ───────────────────────────────────────────────────────────────────
  if (resource === "users") {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      // accessToken excluded — contains live GitHub OAuth tokens
      select: {
        id: true,
        githubId: true,
        username: true,
        email: true,
        avatarUrl: true,
        plan: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ data: users, count: users.length });
  }

  // ── Saved Repos ─────────────────────────────────────────────────────────────
  if (resource === "savedRepos") {
    const savedRepos = await prisma.savedRepo.findMany({ orderBy: { addedAt: "asc" } });
    return NextResponse.json({ data: savedRepos, count: savedRepos.length });
  }

  // ── Changelogs (paginated — can be large) ───────────────────────────────────
  if (resource === "changelogs") {
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = 200;
    const [changelogs, total] = await Promise.all([
      prisma.changelog.findMany({
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.changelog.count(),
    ]);
    return NextResponse.json({
      data: changelogs,
      count: changelogs.length,
      total,
      hasMore: page * limit < total,
      page,
    });
  }

  // ── Subscriptions ───────────────────────────────────────────────────────────
  if (resource === "subscriptions") {
    const subscriptions = await prisma.subscription.findMany({
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ data: subscriptions, count: subscriptions.length });
  }

  return NextResponse.json({ error: "Unknown resource" }, { status: 400 });
}
