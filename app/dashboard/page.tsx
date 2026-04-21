"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SavedRepo {
  id: string;
  repoName: string;
  repoOwner: string;
  isPrivate: boolean;
}

interface ChangelogEntry {
  id: string;
  repoName: string;
  repoOwner: string;
  shareToken: string;
  createdAt: string;
  isPrivate: boolean;
}

interface UserData {
  id: string;
  username: string;
  avatarUrl: string;
  plan: string;
  savedRepos: SavedRepo[];
  changelogs: ChangelogEntry[];
  subscription: {
    status: string;
    currentPeriodEnd: string;
    razorpaySubId?: string;
  } | null;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
}

type Tab = "repos" | "payments";

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [tab, setTab] = useState<Tab>("repos");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  const fetchUser = useCallback(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then(setUser);
  }, []);

  useEffect(() => {
    if (session) fetchUser();
  }, [session, fetchUser]);

  if (status === "loading" || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Sidebar ── */}
      <Sidebar user={user} tab={tab} setTab={setTab} onRepoChange={fetchUser} />

      {/* ── Main content ── */}
      <main className="flex-1 min-h-screen p-8 overflow-y-auto">
        {tab === "repos" && <RepoContent user={user} />}
        {tab === "payments" && <PaymentsContent user={user} onCancel={fetchUser} />}
      </main>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  user,
  tab,
  setTab,
  onRepoChange,
}: {
  user: UserData;
  tab: Tab;
  setTab: (t: Tab) => void;
  onRepoChange: () => void;
}) {
  return (
    <aside className="w-72 min-h-screen bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Profile */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.username} className="w-10 h-10 rounded-full ring-2 ring-gray-700" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
              {user.username[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{user.username}</div>
            {user.plan === "ADMIN" ? (
              <span className="inline-flex items-center gap-1 text-xs bg-red-900/40 text-red-300 px-2 py-0.5 rounded-full font-medium border border-red-700/40">
                ⚡ Admin
              </span>
            ) : user.plan === "PRO" ? (
              <span className="inline-flex items-center gap-1 text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-medium">
                ✦ Pro
              </span>
            ) : (
              <span className="text-xs text-gray-500">Free Plan</span>
            )}
          </div>
        </div>

        {user.plan === "FREE" && (
          <Link
            href="/pricing"
            className="block w-full text-center bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
          >
            Upgrade to Pro →
          </Link>
        )}
      </div>

      {/* Nav */}
      <nav className="p-3 border-b border-gray-800">
        <button
          onClick={() => setTab("repos")}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "repos" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          Repositories
        </button>
        <button
          onClick={() => setTab("payments")}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors mt-1 ${
            tab === "payments" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Payments
        </button>
        {user.plan === "ADMIN" && (
          <Link
            href="/admin"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors mt-1 text-red-400 hover:text-red-300 hover:bg-red-900/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Admin Panel
          </Link>
        )}
      </nav>

      {/* Repo sections */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <PublicReposSection user={user} onRepoChange={onRepoChange} />
        <PrivateRepoSection user={user} onRepoChange={onRepoChange} />
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-800">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}

// ─── Public Repos Section ─────────────────────────────────────────────────────

function PublicReposSection({ user, onRepoChange }: { user: UserData; onRepoChange: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const publicSaved = user.savedRepos.filter((r) => !r.isPrivate);

  async function loadGithubRepos() {
    setLoadingRepos(true);
    const res = await fetch("/api/repos");
    const data = await res.json();
    setGithubRepos((data.repos ?? []).filter((r: GitHubRepo) => !r.private));
    setLoadingRepos(false);
  }

  function openAdd() {
    setShowAdd(true);
    loadGithubRepos();
  }

  const filtered = githubRepos.filter(
    (r) =>
      r.full_name.toLowerCase().includes(search.toLowerCase()) &&
      !publicSaved.some((s) => s.repoOwner === r.full_name.split("/")[0] && s.repoName === r.name)
  );

  async function addRepo(repo: GitHubRepo) {
    await fetch("/api/repos/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repoOwner: repo.full_name.split("/")[0],
        repoName: repo.name,
        isPrivate: false,
      }),
    });
    onRepoChange();
  }

  async function removeRepo(repo: SavedRepo) {
    setRemovingId(repo.id);
    await fetch("/api/repos/saved", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoOwner: repo.repoOwner, repoName: repo.repoName }),
    });
    onRepoChange();
    setRemovingId(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Public Repos</span>
        <button
          onClick={showAdd ? () => setShowAdd(false) : openAdd}
          className="w-5 h-5 flex items-center justify-center rounded bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors text-sm font-bold"
          title="Add public repo"
        >
          {showAdd ? "×" : "+"}
        </button>
      </div>

      {showAdd && (
        <div className="mb-3 bg-gray-800 rounded-lg p-3">
          <input
            type="text"
            placeholder="Search repos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-1.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 mb-2"
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {loadingRepos ? (
              <p className="text-xs text-gray-500 text-center py-2">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-2">No repos found</p>
            ) : (
              filtered.map((r) => (
                <button
                  key={r.id}
                  onClick={() => { addRepo(r); setShowAdd(false); }}
                  className="w-full text-left px-2 py-1.5 rounded text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors truncate"
                >
                  {r.full_name}
                  {r.description && (
                    <span className="block text-xs text-gray-500 truncate">{r.description}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <div className="space-y-1">
        {publicSaved.length === 0 ? (
          <p className="text-xs text-gray-600 px-1 py-2">No repos added yet</p>
        ) : (
          publicSaved.map((repo) => (
            <RepoItem
              key={repo.id}
              repo={repo}
              onRemove={() => removeRepo(repo)}
              removing={removingId === repo.id}
              canRemove={true}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Private Repo Section ─────────────────────────────────────────────────────

function PrivateRepoSection({ user, onRepoChange }: { user: UserData; onRepoChange: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  const [search, setSearch] = useState("");
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const privateSaved = user.savedRepos.filter((r) => r.isPrivate);
  const isPro = user.plan === "PRO" || user.plan === "ADMIN";
  const hasPrivateSlot = isPro || privateSaved.length === 0;

  async function loadPrivateRepos() {
    setLoadingRepos(true);
    const res = await fetch("/api/repos");
    const data = await res.json();
    setGithubRepos((data.repos ?? []).filter((r: GitHubRepo) => r.private));
    setLoadingRepos(false);
  }

  function openAdd() {
    if (!hasPrivateSlot) {
      setError("Free plan allows only 1 private repo. Upgrade to Pro.");
      return;
    }
    setError("");
    setShowAdd(true);
    loadPrivateRepos();
  }

  const filtered = githubRepos.filter(
    (r) =>
      r.full_name.toLowerCase().includes(search.toLowerCase()) &&
      !privateSaved.some((s) => s.repoOwner === r.full_name.split("/")[0] && s.repoName === r.name)
  );

  async function addRepo(repo: GitHubRepo) {
    const res = await fetch("/api/repos/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repoOwner: repo.full_name.split("/")[0],
        repoName: repo.name,
        isPrivate: true,
      }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed to add repo");
      return;
    }
    setError("");
    onRepoChange();
  }

  async function removeRepo(repo: SavedRepo) {
    if (!isPro) return;
    setRemovingId(repo.id);
    await fetch("/api/repos/saved", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoOwner: repo.repoOwner, repoName: repo.repoName }),
    });
    onRepoChange();
    setRemovingId(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Private Repo</span>
          <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        </div>
        {hasPrivateSlot && (
          <button
            onClick={showAdd ? () => setShowAdd(false) : openAdd}
            className="w-5 h-5 flex items-center justify-center rounded bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors text-sm font-bold"
          >
            {showAdd ? "×" : "+"}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-2 text-xs text-red-400 bg-red-900/20 border border-red-800 rounded-md px-2 py-1.5">
          {error}
          {error.includes("Upgrade") && (
            <Link href="/pricing" className="ml-1 underline">Upgrade →</Link>
          )}
        </div>
      )}

      {!isPro && privateSaved.length === 0 && (
        <p className="text-xs text-gray-600 px-1 mb-1">
          1 private repo on free plan
        </p>
      )}

      {showAdd && (
        <div className="mb-3 bg-gray-800 rounded-lg p-3">
          <input
            type="text"
            placeholder="Search private repos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-1.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 mb-2"
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {loadingRepos ? (
              <p className="text-xs text-gray-500 text-center py-2">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-2">No private repos found</p>
            ) : (
              filtered.map((r) => (
                <button
                  key={r.id}
                  onClick={() => { addRepo(r); setShowAdd(false); }}
                  className="w-full text-left px-2 py-1.5 rounded text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors truncate"
                >
                  🔒 {r.full_name}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <div className="space-y-1">
        {privateSaved.length === 0 ? (
          <p className="text-xs text-gray-600 px-1 py-2">No private repo added</p>
        ) : (
          privateSaved.map((repo) => (
            <RepoItem
              key={repo.id}
              repo={repo}
              onRemove={() => removeRepo(repo)}
              removing={removingId === repo.id}
              canRemove={isPro}
              lockedTooltip="Upgrade to Pro to remove"
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Repo Item ────────────────────────────────────────────────────────────────

function RepoItem({
  repo,
  onRemove,
  removing,
  canRemove,
  lockedTooltip,
}: {
  repo: SavedRepo;
  onRemove: () => void;
  removing: boolean;
  canRemove: boolean;
  lockedTooltip?: string;
}) {
  return (
    <div className="group flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-gray-800 transition-colors">
      <div className="flex items-center gap-1.5 min-w-0">
        {repo.isPrivate && (
          <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        )}
        <span className="text-sm text-gray-300 truncate">
          {repo.repoOwner}/{repo.repoName}
        </span>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <Link
          href={`/generate?owner=${repo.repoOwner}&repo=${repo.repoName}`}
          className="text-xs text-indigo-400 hover:text-indigo-300 px-1.5 py-0.5 rounded hover:bg-indigo-900/30 transition-colors"
          title="Generate changelog"
        >
          ↗
        </Link>
        {canRemove ? (
          <button
            onClick={onRemove}
            disabled={removing}
            className="text-xs text-gray-500 hover:text-red-400 px-1 py-0.5 rounded hover:bg-red-900/20 transition-colors"
            title="Remove"
          >
            {removing ? "…" : "×"}
          </button>
        ) : (
          <span className="text-xs text-gray-600 px-1" title={lockedTooltip}>🔒</span>
        )}
      </div>
    </div>
  );
}

// ─── Repo Content (main panel) ────────────────────────────────────────────────

function RepoContent({ user }: { user: UserData }) {
  const allSaved = user.savedRepos;
  const recentChangelogs = user.changelogs;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {allSaved.length} repo{allSaved.length !== 1 ? "s" : ""} tracked
          </p>
        </div>
        <Link
          href="/generate"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Generate Changelog
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Changelogs"
          value={recentChangelogs.length.toString()}
          icon="📋"
          sub="generated"
        />
        <StatCard
          label="Public Repos"
          value={allSaved.filter((r) => !r.isPrivate).length.toString()}
          icon="🌐"
          sub="tracked"
        />
        <StatCard
          label="Private Repos"
          value={allSaved.filter((r) => r.isPrivate).length.toString()}
          icon="🔒"
          sub={user.plan === "FREE" ? "1 max on free" : "unlimited"}
        />
      </div>

      {/* Recent changelogs */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Recent Changelogs
        </h2>

        {recentChangelogs.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-gray-700 rounded-2xl">
            <div className="text-4xl mb-3">📝</div>
            <p className="text-gray-400 mb-4">No changelogs generated yet.</p>
            <Link
              href="/generate"
              className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors"
            >
              Generate your first →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentChangelogs.map((log) => (
              <ChangelogRow key={log.id} log={log} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, icon, sub }: { label: string; value: string; icon: string; sub: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label} · {sub}</div>
    </div>
  );
}

function ChangelogRow({ log }: { log: ChangelogEntry }) {
  return (
    <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 hover:border-gray-700 transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${log.isPrivate ? "bg-yellow-500" : "bg-green-500"}`} />
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">
            {log.repoOwner}/{log.repoName}
          </div>
          <div className="text-xs text-gray-500">
            {new Date(log.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            {log.isPrivate && <span className="ml-2 text-yellow-600">private</span>}
          </div>
        </div>
      </div>
      <Link
        href={`/changelog/${log.shareToken}`}
        className="text-indigo-400 hover:text-indigo-300 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-4"
      >
        View →
      </Link>
    </div>
  );
}

// ─── Payments Content ─────────────────────────────────────────────────────────

function PaymentsContent({ user, onCancel }: { user: UserData; onCancel: () => void }) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState("");
  const sub = user.subscription;

  async function handleCancel() {
    if (!confirm("Cancel your Pro subscription? You'll keep access until the period ends.")) return;
    setCancelling(true);
    setError("");
    const res = await fetch("/api/subscription/cancel", { method: "POST" });
    if (res.ok) {
      setCancelled(true);
      onCancel();
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to cancel");
    }
    setCancelling(false);
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-gray-400 text-sm mt-0.5">Manage your subscription</p>
      </div>

      {/* Current Plan */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-semibold text-lg">
              {user.plan === "ADMIN" ? (
                <span className="flex items-center gap-2">
                  <span className="text-red-400">⚡</span> Admin
                </span>
              ) : user.plan === "PRO" ? (
                <span className="flex items-center gap-2">
                  <span className="text-indigo-400">✦</span> Pro Plan
                </span>
              ) : "Free Plan"}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {user.plan === "ADMIN"
                ? "Full access · All repos · No limits · Admin panel"
                : user.plan === "PRO"
                ? "Unlimited private repos · Priority generation · Download exports"
                : "Unlimited public repos · 1 private repo"}
            </p>
          </div>
          <div className="text-right">
            {user.plan === "ADMIN" ? (
              <div className="text-2xl font-bold text-red-400">∞</div>
            ) : user.plan === "PRO" ? (
              <div className="text-2xl font-bold">₹199<span className="text-sm font-normal text-gray-400">/mo</span></div>
            ) : (
              <div className="text-2xl font-bold text-gray-400">$0</div>
            )}
          </div>
        </div>

        {user.plan === "FREE" && (
          <div className="mt-4 pt-4 border-t border-gray-800">
            <Link
              href="/pricing"
              className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors"
            >
              Upgrade to Pro →
            </Link>
          </div>
        )}
      </div>

      {/* Subscription details */}
      {sub && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h3 className="font-semibold mb-4">Subscription Details</h3>
          <div className="space-y-3">
            <DetailRow label="Status">
              <StatusBadge status={sub.status} />
            </DetailRow>
            <DetailRow label="Current period ends">
              <span className="text-sm text-gray-300">
                {new Date(sub.currentPeriodEnd).toLocaleDateString("en-US", {
                  month: "long", day: "numeric", year: "numeric",
                })}
              </span>
            </DetailRow>
            <DetailRow label="Payment method">
              <span className="text-sm text-gray-300">
                {sub.razorpaySubId ? "Razorpay" : "—"}
              </span>
            </DetailRow>
          </div>

          {sub.status === "active" && !cancelled && (
            <div className="mt-6 pt-4 border-t border-gray-800">
              {error && (
                <p className="text-red-400 text-sm mb-3">{error}</p>
              )}
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="text-sm text-red-400 hover:text-red-300 hover:underline disabled:opacity-50 transition-colors"
              >
                {cancelling ? "Cancelling..." : "Cancel subscription"}
              </button>
              <p className="text-xs text-gray-600 mt-1">
                You&apos;ll retain Pro access until your billing period ends.
              </p>
            </div>
          )}

          {(sub.status === "cancelled" || cancelled) && (
            <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-800/50 rounded-lg">
              <p className="text-sm text-yellow-400">
                Subscription cancelled. Pro access continues until {" "}
                {new Date(sub.currentPeriodEnd).toLocaleDateString()}.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Plan comparison */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="font-semibold mb-4">What&apos;s included</h3>
        <div className="grid grid-cols-2 gap-4">
          <FeatureList
            title="Free"
            features={[
              "Unlimited public repos",
              "1 private repo",
              "Shareable links",
              "Last 10 changelogs",
            ]}
            highlighted={user.plan === "FREE"}
          />
          <FeatureList
            title="Pro"
            features={[
              "Everything in Free",
              "Unlimited private repos",
              "Up to 1 year history",
              "Download MD / PDF",
              "Priority generation",
            ]}
            highlighted={user.plan === "PRO"}
          />
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-green-900/40 text-green-400 border-green-800",
    cancelled: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
    past_due: "bg-red-900/40 text-red-400 border-red-800",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${map[status] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>
      {status}
    </span>
  );
}

function FeatureList({ title, features, highlighted }: { title: string; features: string[]; highlighted: boolean }) {
  return (
    <div className={`rounded-xl p-4 border ${highlighted ? "border-indigo-600 bg-indigo-950/30" : "border-gray-800"}`}>
      <div className="font-medium text-sm mb-3">{title}</div>
      <ul className="space-y-1.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-gray-400">
            <span className={highlighted ? "text-indigo-400" : "text-gray-600"}>✓</span>
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
