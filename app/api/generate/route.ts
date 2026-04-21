import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchCommits } from "@/lib/github";
import { generateChangelog } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const session = await auth();
  const { repoOwner, repoName, dateFrom, dateTo } = await req.json();

  if (!repoOwner || !repoName || !dateFrom || !dateTo) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Check if repo is private
  const repoRes = await fetch(
    `https://api.github.com/repos/${repoOwner}/${repoName}`,
    session?.user?.id
      ? {
          headers: {
            Authorization: `Bearer ${await getAccessToken(session.user.id)}`,
          },
        }
      : {}
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

    if (user?.plan === "FREE") {
      const privateCount = await prisma.changelog.count({
        where: { userId: session.user.id, isPrivate: true },
      });

      if (privateCount >= 1) {
        return NextResponse.json(
          { error: "Free plan limited to 1 private repo. Upgrade to Pro." },
          { status: 403 }
        );
      }
    }
  }

  const accessToken = session?.user?.id ? await getAccessToken(session.user.id) : null;

  if (!accessToken && isPrivate) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const commits = await fetchCommits(
    accessToken ?? "",
    repoOwner,
    repoName,
    new Date(dateFrom).toISOString(),
    new Date(dateTo).toISOString()
  );

  if (commits.length === 0) {
    return NextResponse.json({ error: "No commits found in date range" }, { status: 404 });
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
