"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import MigrationTab from "./MigrationTab";

interface Stats {
  totalUsers: number;
  proUsers: number;
  freeUsers: number;
  adminUsers: number;
  totalChangelogs: number;
  totalSavedRepos: number;
  activeSubscriptions: number;
}

interface RecentUser {
  id: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  plan: string;
  createdAt: string;
  _count: { changelogs: number; savedRepos: number };
}

interface RecentChangelog {
  id: string;
  repoOwner: string;
  repoName: string;
  isPrivate: boolean;
  shareToken: string;
  createdAt: string;
  user: { username: string; avatarUrl: string | null } | null;
}

interface AdminData {
  stats: Stats;
  recentUsers: RecentUser[];
  recentChangelogs: RecentChangelog[];
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "users" | "changelogs" | "migration">("overview");

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/"); return; }
    if (status === "loading") return;
    if (session?.user?.plan !== "ADMIN") { router.push("/dashboard"); return; }

    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, [session, status, router]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { stats, recentUsers, recentChangelogs } = data;

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold bg-red-900/50 text-red-300 border border-red-700/50 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Admin
            </span>
          </div>
          <h1 className="text-2xl font-bold">Phigen Admin</h1>
          <p className="text-gray-400 text-sm mt-0.5">Logged in as <span className="text-white font-medium">{session?.user?.username}</span></p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 px-4 py-2 rounded-lg transition-colors"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {(["overview", "users", "changelogs", "migration"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              tab === t
                ? "bg-gray-700 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Users" value={stats.totalUsers} color="blue" />
            <StatCard label="Pro Users" value={stats.proUsers} color="indigo" sub={`${stats.freeUsers} free`} />
            <StatCard label="Changelogs" value={stats.totalChangelogs} color="emerald" />
            <StatCard label="Active Subs" value={stats.activeSubscriptions} color="yellow" sub="Razorpay" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard label="Saved Repos" value={stats.totalSavedRepos} color="purple" />
            <StatCard label="Admin Accounts" value={stats.adminUsers} color="red" />
          </div>

          {/* Recent activity side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Section title="Recent Signups">
              <div className="space-y-2">
                {recentUsers.slice(0, 5).map((u) => (
                  <UserRow key={u.id} user={u} />
                ))}
              </div>
            </Section>
            <Section title="Recent Changelogs">
              <div className="space-y-2">
                {recentChangelogs.slice(0, 5).map((c) => (
                  <ChangelogRow key={c.id} cl={c} />
                ))}
              </div>
            </Section>
          </div>
        </div>
      )}

      {/* Users */}
      {tab === "users" && (
        <Section title={`All Users (${recentUsers.length})`}>
          <div className="space-y-2">
            {recentUsers.map((u) => (
              <UserRow key={u.id} user={u} detailed />
            ))}
          </div>
        </Section>
      )}

      {/* Changelogs */}
      {tab === "changelogs" && (
        <Section title={`Recent Changelogs (${recentChangelogs.length})`}>
          <div className="space-y-2">
            {recentChangelogs.map((c) => (
              <ChangelogRow key={c.id} cl={c} detailed />
            ))}
          </div>
        </Section>
      )}

      {/* Migration */}
      {tab === "migration" && <MigrationTab />}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: number;
  color: "blue" | "indigo" | "emerald" | "yellow" | "purple" | "red";
  sub?: string;
}) {
  const colors = {
    blue: "text-blue-400",
    indigo: "text-indigo-400",
    emerald: "text-emerald-400",
    yellow: "text-yellow-400",
    purple: "text-purple-400",
    red: "text-red-400",
  };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colors[color]}`}>{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">{title}</h2>
      {children}
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    ADMIN: "bg-red-900/50 text-red-300 border-red-700/50",
    PRO: "bg-indigo-900/50 text-indigo-300 border-indigo-700/50",
    FREE: "bg-gray-800 text-gray-400 border-gray-700",
  };
  return (
    <span className={`text-xs font-medium border px-1.5 py-0.5 rounded-md ${styles[plan] ?? styles.FREE}`}>
      {plan}
    </span>
  );
}

function UserRow({ user, detailed }: { user: RecentUser; detailed?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-800/60 last:border-0">
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt={user.username} className="w-8 h-8 rounded-full flex-shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <a
            href={`https://github.com/${user.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium hover:text-indigo-400 transition-colors"
          >
            {user.username}
          </a>
          <PlanBadge plan={user.plan} />
        </div>
        {detailed && user.email && (
          <p className="text-xs text-gray-500">{user.email}</p>
        )}
      </div>
      {detailed && (
        <div className="text-right flex-shrink-0 text-xs text-gray-500 space-y-0.5">
          <p>{user._count.changelogs} logs</p>
          <p>{user._count.savedRepos} repos</p>
        </div>
      )}
      <p className="text-xs text-gray-600 flex-shrink-0">{fmtDate(user.createdAt)}</p>
    </div>
  );
}

function ChangelogRow({ cl, detailed }: { cl: RecentChangelog; detailed?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-800/60 last:border-0">
      {cl.user?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cl.user.avatarUrl} alt={cl.user.username} className="w-6 h-6 rounded-full flex-shrink-0" />
      ) : (
        <div className="w-6 h-6 rounded-full bg-gray-700 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/changelog/${cl.shareToken}`}
            className="text-sm font-medium hover:text-indigo-400 transition-colors truncate"
          >
            {cl.repoOwner}/{cl.repoName}
          </Link>
          {cl.isPrivate && (
            <span className="text-xs text-gray-500 bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded flex-shrink-0">🔒</span>
          )}
        </div>
        {detailed && cl.user && (
          <p className="text-xs text-gray-500">by {cl.user.username}</p>
        )}
      </div>
      <p className="text-xs text-gray-600 flex-shrink-0">{fmtDate(cl.createdAt)}</p>
    </div>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
