import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CopyButton } from "@/components/CopyButton";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ChangelogPage({ params }: Props) {
  const { token } = await params;

  const changelog = await prisma.changelog.findUnique({
    where: { shareToken: token },
    select: {
      repoName: true,
      repoOwner: true,
      dateFrom: true,
      dateTo: true,
      content: true,
      createdAt: true,
    },
  });

  if (!changelog) notFound();

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">
          ← Dashboard
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="text-3xl font-bold">
          {changelog.repoOwner}/{changelog.repoName}
        </h1>
        <p className="text-gray-400 mt-1">
          {fmt(changelog.dateFrom)} — {fmt(changelog.dateTo)}
        </p>
      </header>

      <div className="prose prose-invert prose-indigo max-w-none">
        <ReactMarkdown>{changelog.content}</ReactMarkdown>
      </div>

      <footer className="mt-12 pt-6 border-t border-gray-800 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Generated {fmt(changelog.createdAt)} · Powered by{" "}
          <Link href="/" className="text-indigo-400 hover:underline">
            Phigen
          </Link>
        </p>
        <CopyButton url={`${process.env.NEXT_PUBLIC_APP_URL}/changelog/${token}`} />
      </footer>
    </main>
  );
}

