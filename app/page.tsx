"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) router.push("/dashboard");
  }, [session, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight">
            Turn commits into{" "}
            <span className="text-indigo-400">changelogs</span>
          </h1>
          <p className="text-xl text-gray-400">
            Connect GitHub. Pick a repo. Get a clean, human-readable changelog powered by Claude AI — with a shareable link.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => signIn("github")}
            disabled={status === "loading"}
            className="flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <GitHubIcon />
            Continue with GitHub
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 text-left">
          <Feature
            icon="✨"
            title="AI-Powered"
            desc="Claude rewrites commit noise into clear, readable entries your whole team understands."
          />
          <Feature
            icon="🔗"
            title="Shareable Links"
            desc="Every changelog gets a permanent public URL. Share with users, stakeholders, or your README."
          />
          <Feature
            icon="🔒"
            title="Free to Start"
            desc="Public repos unlimited. One private repo free. Upgrade for more."
          />
        </div>

        <div className="pt-4 text-sm text-gray-500">
          Free tier — no credit card required
        </div>
      </div>
    </main>
  );
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-gray-900 rounded-xl p-5 space-y-2">
      <div className="text-2xl">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-gray-400">{desc}</p>
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.54-1.38-1.33-1.75-1.33-1.75-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.04.13 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.65 1.66.25 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
