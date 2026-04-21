import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

type Step = "verify" | "users" | "savedRepos" | "changelogs" | "subscriptions" | "verifyCounts";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.plan)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { oldServerUrl, secret, step } = (await req.json()) as {
    oldServerUrl: string;
    secret: string;
    step: Step;
  };

  const base = oldServerUrl.replace(/\/$/, "");

  function exportUrl(resource: string, extra = "") {
    return `${base}/api/admin/migration/export?secret=${encodeURIComponent(secret)}&resource=${resource}${extra}`;
  }

  async function safeFetch(url: string) {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    return res.json();
  }

  try {
    // ── Step 1: Verify connection ────────────────────────────────────────────
    if (step === "verify") {
      const data = await safeFetch(exportUrl("ping"));
      return NextResponse.json({ ok: true, counts: data.counts });
    }

    // ── Step 2: Import users ─────────────────────────────────────────────────
    if (step === "users") {
      const { data: users } = await safeFetch(exportUrl("users"));
      let imported = 0;

      for (const u of users) {
        await prisma.user.upsert({
          where: { githubId: u.githubId },
          update: {
            username: u.username,
            email: u.email,
            avatarUrl: u.avatarUrl,
            accessToken: u.accessToken,
            plan: u.plan,
          },
          create: {
            id: u.id,
            githubId: u.githubId,
            username: u.username,
            email: u.email,
            avatarUrl: u.avatarUrl,
            accessToken: u.accessToken,
            plan: u.plan,
            createdAt: new Date(u.createdAt),
          },
        });
        imported++;
      }

      return NextResponse.json({ ok: true, imported });
    }

    // ── Step 3: Import saved repos ───────────────────────────────────────────
    if (step === "savedRepos") {
      const { data: repos } = await safeFetch(exportUrl("savedRepos"));
      let imported = 0;

      for (const r of repos) {
        await prisma.savedRepo.upsert({
          where: {
            userId_repoOwner_repoName: {
              userId: r.userId,
              repoOwner: r.repoOwner,
              repoName: r.repoName,
            },
          },
          update: { isPrivate: r.isPrivate },
          create: {
            id: r.id,
            userId: r.userId,
            repoOwner: r.repoOwner,
            repoName: r.repoName,
            isPrivate: r.isPrivate,
            addedAt: new Date(r.addedAt),
          },
        });
        imported++;
      }

      return NextResponse.json({ ok: true, imported });
    }

    // ── Step 4: Import changelogs (paginated) ────────────────────────────────
    if (step === "changelogs") {
      let page = 1;
      let totalImported = 0;

      while (true) {
        const { data: changelogs, hasMore } = await safeFetch(
          exportUrl("changelogs", `&page=${page}`)
        );

        for (const cl of changelogs) {
          await prisma.changelog.upsert({
            where: { shareToken: cl.shareToken },
            update: { content: cl.content },
            create: {
              id: cl.id,
              userId: cl.userId,
              repoName: cl.repoName,
              repoOwner: cl.repoOwner,
              isPrivate: cl.isPrivate,
              dateFrom: new Date(cl.dateFrom),
              dateTo: new Date(cl.dateTo),
              content: cl.content,
              shareToken: cl.shareToken,
              createdAt: new Date(cl.createdAt),
            },
          });
          totalImported++;
        }

        if (!hasMore) break;
        page++;
      }

      return NextResponse.json({ ok: true, imported: totalImported });
    }

    // ── Step 5: Import subscriptions ─────────────────────────────────────────
    if (step === "subscriptions") {
      const { data: subs } = await safeFetch(exportUrl("subscriptions"));
      let imported = 0;

      for (const s of subs) {
        await prisma.subscription.upsert({
          where: { userId: s.userId },
          update: {
            razorpaySubId: s.razorpaySubId,
            status: s.status,
            currentPeriodEnd: new Date(s.currentPeriodEnd),
          },
          create: {
            id: s.id,
            userId: s.userId,
            razorpaySubId: s.razorpaySubId,
            status: s.status,
            currentPeriodEnd: new Date(s.currentPeriodEnd),
            createdAt: new Date(s.createdAt),
          },
        });
        imported++;
      }

      return NextResponse.json({ ok: true, imported });
    }

    // ── Step 6: Verify counts match ──────────────────────────────────────────
    if (step === "verifyCounts") {
      const { counts: oldCounts } = await safeFetch(exportUrl("ping"));

      const [users, savedRepos, changelogs, subscriptions] = await Promise.all([
        prisma.user.count(),
        prisma.savedRepo.count(),
        prisma.changelog.count(),
        prisma.subscription.count(),
      ]);

      const newCounts: Record<string, number> = { users, savedRepos, changelogs, subscriptions };
      const oldCountsTyped: Record<string, number> = oldCounts;

      const allMatch = Object.keys(oldCountsTyped).every(
        (k) => (newCounts[k] ?? 0) >= oldCountsTyped[k]
      );

      return NextResponse.json({ ok: true, oldCounts, newCounts, allMatch });
    }

    return NextResponse.json({ error: "Unknown step" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg });
  }
}
