"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SavedRepo {
  id: string;
  repoName: string;
  repoOwner: string;
  isPrivate: boolean;
}

interface Branch {
  name: string;
  protected: boolean;
}

type DatePreset = "7d" | "30d" | "90d" | "180d" | "1y" | "custom";

const PRESETS: { label: string; value: DatePreset; days: number }[] = [
  { label: "7 days", value: "7d", days: 7 },
  { label: "30 days", value: "30d", days: 30 },
  { label: "3 months", value: "90d", days: 90 },
  { label: "6 months", value: "180d", days: 180 },
  { label: "1 year", value: "1y", days: 365 },
  { label: "Custom", value: "custom", days: 0 },
];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Page (wrapped for useSearchParams) ──────────────────────────────────────

export default function GeneratePage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <GeneratePageInner />
    </Suspense>
  );
}

function GeneratePageInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const preselectedOwner = searchParams.get("owner") ?? "";
  const preselectedRepo = searchParams.get("repo") ?? "";

  // Repos
  const [savedRepos, setSavedRepos] = useState<SavedRepo[]>([]);
  const [reposLoading, setReposLoading] = useState(true);
  const [selected, setSelected] = useState<SavedRepo | null>(null);

  // Branches
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branch, setBranch] = useState("");

  // Date range
  const [preset, setPreset] = useState<DatePreset>("30d");
  const [dateFrom, setDateFrom] = useState(daysAgo(30));
  const [dateTo, setDateTo] = useState(today());

  // Submit
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((data) => {
        const repos: SavedRepo[] = data.savedRepos ?? [];
        setSavedRepos(repos);
        setReposLoading(false);

        // Pre-select from query params
        if (preselectedOwner && preselectedRepo) {
          const match = repos.find(
            (r) => r.repoOwner === preselectedOwner && r.repoName === preselectedRepo
          );
          if (match) setSelected(match);
        }
      });
  }, [session, preselectedOwner, preselectedRepo]);

  const loadBranches = useCallback(async (repo: SavedRepo) => {
    setBranchesLoading(true);
    setBranch("");
    setBranches([]);
    try {
      const res = await fetch(
        `/api/repos/branches?owner=${repo.repoOwner}&repo=${repo.repoName}`
      );
      if (res.ok) {
        const data = await res.json();
        setBranches(data.branches ?? []);
      }
    } finally {
      setBranchesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selected) loadBranches(selected);
  }, [selected, loadBranches]);

  function applyPreset(p: DatePreset) {
    setPreset(p);
    if (p !== "custom") {
      const days = PRESETS.find((x) => x.value === p)!.days;
      setDateFrom(daysAgo(days));
      setDateTo(today());
    }
  }

  async function handleGenerate() {
    if (!selected || !dateFrom || !dateTo) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoOwner: selected.repoOwner,
          repoName: selected.repoName,
          dateFrom,
          dateTo,
          branch: branch || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Generation failed");
        return;
      }

      router.push(`/changelog/${data.shareToken}`);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") return <LoadingSpinner />;

  const canGenerate = !!selected && !!dateFrom && !!dateTo && !loading;

  return (
    <div className="min-h-screen flex items-start justify-center p-8">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </Link>
          <h1 className="text-2xl font-bold">Generate Changelog</h1>
          <p className="text-gray-400 text-sm mt-1">Select a repo, pick a date range, and let Claude do the rest.</p>
        </div>

        <div className="space-y-5">
          {/* ── Repo picker ── */}
          <Card label="Repository" icon="📁">
            {reposLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-1">
                <Spinner /> Loading saved repos...
              </div>
            ) : savedRepos.length === 0 ? (
              <div className="text-sm text-gray-500 py-1">
                No repos saved.{" "}
                <Link href="/dashboard" className="text-indigo-400 hover:underline">
                  Add repos in Dashboard →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {savedRepos.map((repo) => (
                  <RepoCard
                    key={repo.id}
                    repo={repo}
                    selected={selected?.id === repo.id}
                    onSelect={() => setSelected(repo)}
                  />
                ))}
              </div>
            )}
          </Card>

          {/* ── Branch picker ── */}
          {selected && (
            <Card label="Branch" icon="🌿">
              {branchesLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-1">
                  <Spinner /> Loading branches...
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <BranchChip
                    name="All branches"
                    selected={branch === ""}
                    onClick={() => setBranch("")}
                    isDefault
                  />
                  {branches.map((b) => (
                    <BranchChip
                      key={b.name}
                      name={b.name}
                      selected={branch === b.name}
                      onClick={() => setBranch(b.name)}
                      isProtected={b.protected}
                    />
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* ── Date range ── */}
          <Card label="Date Range" icon="📅">
            {/* Preset pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => applyPreset(p.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    preset === p.value
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30"
                      : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Date summary / custom inputs */}
            {preset !== "custom" ? (
              <div className="flex items-center gap-3 bg-gray-800/60 rounded-xl px-4 py-3 text-sm">
                <span className="text-gray-400">From</span>
                <span className="font-medium text-white">{fmtDate(dateFrom)}</span>
                <span className="text-gray-600">→</span>
                <span className="font-medium text-white">{fmtDate(dateTo)}</span>
                <span className="text-gray-500 ml-auto text-xs">
                  {PRESETS.find((p) => p.value === preset)?.days} days
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <DateInput label="From" value={dateFrom} onChange={setDateFrom} max={dateTo} />
                <DateInput label="To" value={dateTo} onChange={setDateTo} min={dateFrom} max={today()} />
              </div>
            )}
          </Card>

          {/* ── Error ── */}
          {error && (
            <div className="flex items-start gap-3 bg-red-950/50 border border-red-800/60 text-red-300 rounded-xl p-4 text-sm">
              <span className="text-red-400 mt-0.5">⚠</span>
              <div>
                {error}
                {error.includes("Upgrade") && (
                  <Link href="/pricing" className="ml-1 text-indigo-400 hover:underline">
                    Upgrade to Pro →
                  </Link>
                )}
                {error.includes("dashboard") && (
                  <Link href="/dashboard" className="ml-1 text-indigo-400 hover:underline">
                    Go to Dashboard →
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* ── Generate button ── */}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full relative bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-900/30 hover:shadow-indigo-900/50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner white />
                Generating with Claude AI...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                ✨ Generate Changelog
                {selected && (
                  <span className="text-indigo-300 text-sm font-normal">
                    · {selected.repoOwner}/{selected.repoName}
                    {branch && ` (${branch})`}
                  </span>
                )}
              </span>
            )}
          </button>

          {loading && (
            <p className="text-center text-xs text-gray-500 animate-pulse">
              Fetching commits and summarising with Claude. This may take 15–30 seconds...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{icon}</span>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      {children}
    </div>
  );
}

function RepoCard({ repo, selected, onSelect }: { repo: SavedRepo; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border text-left transition-all ${
        selected
          ? "border-indigo-500 bg-indigo-950/40 shadow-md shadow-indigo-900/20"
          : "border-gray-700 hover:border-gray-600 hover:bg-gray-800/50"
      }`}
    >
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${selected ? "bg-indigo-400" : "bg-gray-600"}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">
            {repo.repoOwner}/{repo.repoName}
          </span>
          {repo.isPrivate && (
            <span className="flex-shrink-0 text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded-md border border-gray-700">
              🔒 private
            </span>
          )}
        </div>
      </div>
      {selected && (
        <svg className="w-4 h-4 text-indigo-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
}

function BranchChip({
  name,
  selected,
  onClick,
  isProtected,
  isDefault,
}: {
  name: string;
  selected: boolean;
  onClick: () => void;
  isProtected?: boolean;
  isDefault?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
        selected
          ? "bg-emerald-900/40 border-emerald-600 text-emerald-300"
          : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
      }`}
    >
      {isDefault ? (
        <span className="text-gray-500">∗</span>
      ) : (
        <svg className="w-3 h-3 opacity-60" fill="currentColor" viewBox="0 0 16 16">
          <path d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 019 8.5H7a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 017 7h2a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5z" />
        </svg>
      )}
      {name}
      {isProtected && <span className="text-xs text-yellow-600">🔒</span>}
    </button>
  );
}

function DateInput({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent [color-scheme:dark]"
      />
    </div>
  );
}

function Spinner({ white }: { white?: boolean }) {
  return (
    <div className={`w-4 h-4 border-2 ${white ? "border-white/30 border-t-white" : "border-gray-600 border-t-gray-300"} rounded-full animate-spin`} />
  );
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner />
    </div>
  );
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}
