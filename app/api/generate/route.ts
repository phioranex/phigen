import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchCommits } from "@/lib/github";
import { generateChangelog } from "@/lib/claude";
import { hasPro } from "@/lib/admin";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Login required to generate changelogs" }, { status: 401 });
  }

  const { repoOwner, repoName, dateFrom, dateTo, branch } = await req.json();

  if (!repoOwner || !repoName || !dateFrom || !dateTo) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const accessToken = await getAccessToken(session.user.id);

  // Check if repo is private via GitHub API
  const repoRes = await fetch(
    `https://api.github.com/repos/${repoOwner}/${repoName}`,
    {
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" }
        : {},
    }
  );

  if (!repoRes.ok) {
    return NextResponse.json({ error: "Repository not found or inaccessible" }, { status: 404 });
  }

  const repoData = await repoRes.json();
  const isPrivate: boolean = repoData.private;

  if (isPrivate) {
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Login required for private repos" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true },
    });

    // Free plan: check they've saved this private repo (already enforced in SavedRepo)
    // but also verify they haven't already used their 1-private-repo changelog slot
    if (!hasPro(user?.plan ?? "FREE")) {
      const savedPrivate = await prisma.savedRepo.findFirst({
        where: { userId: session.user.id, isPrivate: true, repoOwner, repoName },
      });

      if (!savedPrivate) {
        return NextResponse.json(
          { error: "Add this private repo to your dashboard first." },
          { status: 403 }
        );
      }
    }
  }

  if (!accessToken && isPrivate) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date(dateFrom);
  since.setHours(0, 0, 0, 0);

  const until = new Date(dateTo);
  until.setHours(23, 59, 59, 999);

  const commits = await fetchCommits(
    accessToken ?? "",
    repoOwner,
    repoName,
    since.toISOString(),
    until.toISOString(),
    branch || undefined
  );

  if (commits.length === 0) {
    return NextResponse.json(
      { error: `No commits found in date range${branch ? ` on branch "${branch}"` : ""}` },
      { status: 404 }
    );
  }

  const commitMessages = commits.map((c) => c.commit.message.split("\n")[0]);
  const content = await generateChangelog(repoOwner, repoName, dateFrom, dateTo, commitMessages);

  const changelog = await prisma.changelog.create({
    data: {
      userId: session?.user?.id ?? null,
      repoName,
      repoOwner,
      isPrivate,
      dateFrom: new Date(dateFrom),
      dateTo: new Date(dateTo),
      content,
    },
  });

  return NextResponse.json({ shareToken: changelog.shareToken });
}

async function getAccessToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accessToken: true },
  });
  return user?.accessToken ?? "";
}
