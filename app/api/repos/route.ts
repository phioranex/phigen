import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchUserRepos } from "@/lib/github";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { accessToken: true, plan: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const repos = await fetchUserRepos(user.accessToken);

  const filtered =
    user.plan === "FREE"
      ? repos.filter((r) => !r.private)
      : repos;

  return NextResponse.json({ repos: filtered, plan: user.plan });
}
