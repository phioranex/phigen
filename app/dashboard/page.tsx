"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface ChangelogEntry {
  id: string;
  repoName: string;
  repoOwner: string;
  shareToken: string;
  createdAt: string;
  isPrivate: boolean;
}

interface UserData {
  username: string;
  avatarUrl: string;
  plan: string;
  changelogs: ChangelogEntry[];
  subscription: { status: string; currentPeriodEnd: string } | null;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetch("/api/user/me")
        .then((r) => r.json())
        .then(setUser);
    }
  }, [session]);

  if (status === "loading" || !user) {
    return <LoadingScreen />;
  }

  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          {user.avatarUrl && (
            <img src={user.avatarUrl} alt={user.username} className="w-10 h-10 rounded-full" />
          )}
          <div>
            <div className="font-semibold">{user.username}</div>
            <div className="text-sm text-gray-400">
              {user.plan === "PRO" ? (
                <span className="text-indigo-400 font-medium">Pro</span>
              ) : (
                <span>Free Plan</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            href="/generate"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Generate Changelog
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-gray-400 hover:text-white px-4 py-2 rounded-lg transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {user.plan === "FREE" && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div>
            <span className="font-medium">Free Plan</span>
            <span className="text-gray-400 text-sm ml-2">— unlimited public repos, 1 private</span>
          </div>
          <Link
            href="/pricing"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
          >
            Upgrade to Pro
          </Link>
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-4">Recent Changelogs</h2>
        {user.changelogs.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            No changelogs yet.{" "}
            <Link href="/generate" className="text-indigo-400 hover:underline">
              Generate your first one.
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {user.changelogs.map((log) => (
              <ChangelogRow key={log.id} log={log} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function ChangelogRow({ log }: { log: ChangelogEntry }) {
  return (
    <div className="bg-gray-900 rounded-xl p-4 flex items-center justify-between">
      <div>
        <div className="font-medium">
          {log.repoOwner}/{log.repoName}
          {log.isPrivate && (
            <span className="ml-2 text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">private</span>
          )}
        </div>
        <div className="text-sm text-gray-400">
          {new Date(log.createdAt).toLocaleDateString()}
        </div>
      </div>
      <Link
        href={`/changelog/${log.shareToken}`}
        className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
      >
        View →
      </Link>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center text-gray-400">
      Loading...
    </div>
  );
}
