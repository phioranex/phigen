import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const changelog = await prisma.changelog.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      repoName: true,
      repoOwner: true,
      dateFrom: true,
      dateTo: true,
      content: true,
      createdAt: true,
    },
  });

  if (!changelog) {
    return NextResponse.json({ error: "Changelog not found" }, { status: 404 });
  }

  return NextResponse.json(changelog);
}
