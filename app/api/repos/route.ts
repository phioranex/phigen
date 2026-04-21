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

  // Return all repos regardless of plan.
  // Limit enforcement (free = 1 private) is in /api/repos/saved.
  return NextResponse.json({ repos, plan: user.plan });
}
