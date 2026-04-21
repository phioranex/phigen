"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Repo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
}

export default function GeneratePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selected, setSelected] = useState<Repo | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reposLoading, setReposLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (session) {
      setReposLoading(true);
      fetch("/api/repos")
        .then((r) => r.json())
        .then((data) => setRepos(data.repos ?? []))
        .finally(() => setReposLoading(false));
    }
  }, [session]);

  async function handleGenerate() {
    if (!selected || !dateFrom || !dateTo) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoOwner: selected.full_name.split("/")[0],
          repoName: selected.name,
          dateFrom,
          dateTo,
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

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Generate Changelog</h1>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Repository</label>
          {reposLoading ? (
            <div className="text-gray-400 text-sm">Loading repos...</div>
          ) : (
            <select
              value={selected?.id ?? ""}
              onChange={(e) => {
                const repo = repos.find((r) => r.id === Number(e.target.value));
                setSelected(repo ?? null);
              }}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a repository</option>
              {repos.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.full_name} {r.private ? "(private)" : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg p-4 text-sm">
            {error}
            {error.includes("Upgrade") && (
              <a href="/pricing" className="ml-2 underline text-indigo-400">Upgrade to Pro →</a>
            )}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={!selected || !dateFrom || !dateTo || loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {loading ? "Generating..." : "Generate Changelog"}
        </button>
      </div>
    </main>
  );
}
