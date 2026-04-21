"use client";

import { useState, useRef } from "react";

type StepId = "verify" | "users" | "savedRepos" | "changelogs" | "subscriptions" | "verifyCounts";

interface StepConfig {
  id: StepId;
  label: string;
  description: string;
  icon: string;
}

const STEPS: StepConfig[] = [
  { id: "verify",        icon: "🔌", label: "Verify connection",       description: "Ping old server, confirm reachable + get counts" },
  { id: "users",         icon: "👤", label: "Import users",            description: "Upsert all user accounts by GitHub ID" },
  { id: "savedRepos",    icon: "📁", label: "Import saved repos",      description: "Upsert saved repo list per user" },
  { id: "changelogs",    icon: "📝", label: "Import changelogs",       description: "Paginated — handles large history" },
  { id: "subscriptions", icon: "💳", label: "Import subscriptions",    description: "Razorpay subscription references + status" },
  { id: "verifyCounts",  icon: "✅", label: "Verify counts",           description: "Compare old vs new row counts" },
];

type StepStatus = "idle" | "running" | "done" | "error" | "warning";

interface StepResult {
  status: StepStatus;
  imported?: number;
  error?: string;
  oldCounts?: Record<string, number>;
  newCounts?: Record<string, number>;
  allMatch?: boolean;
  counts?: Record<string, number>;
}

type StepStates = Record<StepId, StepResult>;

const defaultStates = (): StepStates =>
  Object.fromEntries(STEPS.map((s) => [s.id, { status: "idle" }])) as StepStates;

export default function MigrationTab() {
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [steps, setSteps] = useState<StepStates>(defaultStates());
  const [running, setRunning] = useState(false);
  const abortRef = useRef(false);

  function setStep(id: StepId, result: Partial<StepResult>) {
    setSteps((prev) => ({ ...prev, [id]: { ...prev[id], ...result } }));
  }

  async function runStep(id: StepId): Promise<boolean> {
    setStep(id, { status: "running", error: undefined });

    const res = await fetch("/api/admin/migration/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldServerUrl: url.trim(), secret: secret.trim(), step: id }),
    });

    const data = await res.json();

    if (!data.ok) {
      setStep(id, { status: "error", error: data.error ?? "Failed" });
      return false;
    }

    if (id === "verifyCounts") {
      setStep(id, {
        status: data.allMatch ? "done" : "warning",
        oldCounts: data.oldCounts,
        newCounts: data.newCounts,
        allMatch: data.allMatch,
      });
      return true;
    }

    if (id === "verify") {
      setStep(id, { status: "done", counts: data.counts });
      return true;
    }

    setStep(id, { status: "done", imported: data.imported });
    return true;
  }

  async function runAll() {
    if (!url || !secret) return;
    setRunning(true);
    abortRef.current = false;
    setSteps(defaultStates());

    for (const step of STEPS) {
      if (abortRef.current) break;
      const ok = await runStep(step.id);
      if (!ok) break; // stop on first error
    }

    setRunning(false);
  }

  function reset() {
    setSteps(defaultStates());
  }

  const anyRunning = running;
  const configured = url.trim() !== "" && secret.trim() !== "";
  const allDone = STEPS.every((s) => steps[s.id].status === "done" || steps[s.id].status === "warning");

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Info banner */}
      <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-4 text-sm text-yellow-200 space-y-1">
        <p className="font-semibold text-yellow-300">⚠ Pre-flight checklist</p>
        <ul className="list-disc list-inside space-y-0.5 text-yellow-200/80 mt-1">
          <li>Old server must have <code className="text-yellow-300">MIGRATION_SECRET</code> env var set</li>
          <li>New server (this one) must have same env vars as old server</li>
          <li><code className="text-yellow-300">NEXTAUTH_SECRET</code> must match — users won&apos;t need to re-login</li>
          <li>Run during low-traffic window for cleanest delta</li>
        </ul>
      </div>

      {/* Config */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Old Server</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Base URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://old-server.example.com"
              disabled={anyRunning}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Migration Secret</label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Same value as MIGRATION_SECRET on old server"
              disabled={anyRunning}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={runAll}
            disabled={!configured || anyRunning}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-all"
          >
            {anyRunning ? (
              <>
                <Spinner />
                Running...
              </>
            ) : (
              "▶ Run Full Migration"
            )}
          </button>

          {anyRunning && (
            <button
              onClick={() => { abortRef.current = true; }}
              className="px-4 py-2.5 rounded-lg text-sm border border-red-700/50 text-red-400 hover:bg-red-900/20 transition-colors"
            >
              Stop
            </button>
          )}

          {!anyRunning && STEPS.some((s) => steps[s.id].status !== "idle") && (
            <button
              onClick={reset}
              className="px-4 py-2.5 rounded-lg text-sm border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Step list */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Migration Steps</h3>
        </div>
        <div className="divide-y divide-gray-800">
          {STEPS.map((step, idx) => {
            const state = steps[step.id];
            return (
              <div key={step.id} className="flex items-start gap-4 px-5 py-4">
                {/* Status icon */}
                <div className="flex-shrink-0 mt-0.5">
                  <StatusIcon status={state.status} index={idx + 1} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{step.icon}</span>
                    <span className="font-medium text-sm">{step.label}</span>
                    {state.status === "done" && state.imported !== undefined && (
                      <span className="text-xs text-emerald-400 bg-emerald-900/30 border border-emerald-700/40 px-2 py-0.5 rounded-full">
                        {state.imported} imported
                      </span>
                    )}
                    {state.status === "done" && step.id === "verify" && state.counts && (
                      <span className="text-xs text-emerald-400">
                        {Object.entries(state.counts).map(([k, v]) => `${v} ${k}`).join(" · ")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{step.description}</p>

                  {/* Error */}
                  {state.status === "error" && state.error && (
                    <p className="text-xs text-red-400 mt-1.5 bg-red-950/30 border border-red-800/40 px-3 py-1.5 rounded-lg">
                      {state.error}
                    </p>
                  )}

                  {/* Verify counts result */}
                  {step.id === "verifyCounts" && state.oldCounts && state.newCounts && (
                    <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                      {Object.keys(state.oldCounts).map((k) => (
                        <div key={k} className="flex justify-between text-gray-500">
                          <span className="capitalize">{k}</span>
                          <span>
                            <span className={state.newCounts![k] >= state.oldCounts![k] ? "text-emerald-400" : "text-red-400"}>
                              {state.newCounts![k]}
                            </span>
                            <span className="text-gray-600"> / {state.oldCounts![k]}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Warning — mismatch */}
                  {state.status === "warning" && (
                    <p className="text-xs text-yellow-400 mt-1.5">
                      ⚠ Some counts don&apos;t match — re-run migration steps above, then verify again.
                    </p>
                  )}
                </div>

                {/* Retry individual step */}
                {(state.status === "error" || state.status === "done" || state.status === "warning") && !anyRunning && (
                  <button
                    onClick={() => runStep(step.id)}
                    className="flex-shrink-0 text-xs text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 px-2.5 py-1 rounded-md transition-colors"
                  >
                    Retry
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Post-migration checklist */}
      {allDone && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-300">🎉 Data migrated — manual steps remaining</h3>
          <ol className="space-y-2 text-sm text-gray-400">
            <li className="flex gap-2">
              <span className="text-gray-600 flex-shrink-0">1.</span>
              <span>
                <strong className="text-white">Stop old server</strong> to prevent new data going to old DB
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-gray-600 flex-shrink-0">2.</span>
              <span>
                <strong className="text-white">Flip DNS</strong> to point domain at new server IP (TTL ~60s for fast propagation)
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-gray-600 flex-shrink-0">3.</span>
              <span>
                <strong className="text-white">Update Razorpay webhook URL</strong> in Razorpay dashboard →
                Settings → Webhooks → update endpoint to new domain
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-gray-600 flex-shrink-0">4.</span>
              <span>
                <strong className="text-white">Update GitHub OAuth callback URL</strong> in GitHub app settings
                → Authorization callback URL → new domain
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-gray-600 flex-shrink-0">5.</span>
              <span>
                <strong className="text-white">Run migration one more time</strong> (optional) after stopping old server
                to catch any final delta from the maintenance window
              </span>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusIcon({ status, index }: { status: StepStatus; index: number }) {
  if (status === "idle") {
    return (
      <div className="w-7 h-7 rounded-full border border-gray-700 bg-gray-800 flex items-center justify-center text-xs text-gray-600 font-mono">
        {index}
      </div>
    );
  }
  if (status === "running") {
    return (
      <div className="w-7 h-7 rounded-full border border-indigo-600 bg-indigo-950/40 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (status === "done") {
    return (
      <div className="w-7 h-7 rounded-full border border-emerald-600 bg-emerald-950/40 flex items-center justify-center text-emerald-400 text-sm">
        ✓
      </div>
    );
  }
  if (status === "warning") {
    return (
      <div className="w-7 h-7 rounded-full border border-yellow-600 bg-yellow-950/40 flex items-center justify-center text-yellow-400 text-sm">
        ⚠
      </div>
    );
  }
  // error
  return (
    <div className="w-7 h-7 rounded-full border border-red-600 bg-red-950/40 flex items-center justify-center text-red-400 text-sm">
      ✗
    </div>
  );
}

function Spinner() {
  return (
    <div className="w-3.5 h-3.5 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin" />
  );
}
