"use client";

import { useSession, signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function PricingPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function subscribe() {
    if (!session) {
      signIn("github");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/subscription/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to create subscription");
        return;
      }

      openRazorpay(data.subscriptionId);
    } finally {
      setLoading(false);
    }
  }

  function openRazorpay(subscriptionId: string) {
    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      subscription_id: subscriptionId,
      name: "Phigen Pro",
      description: "Monthly subscription",
      handler: () => {
        window.location.href = "/dashboard";
      },
    };
    const rzp = new (window as unknown as {
      Razorpay: new (opts: typeof options) => { open: () => void };
    }).Razorpay(options);
    rzp.open();
  }

  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <Link href="/" className="text-gray-400 hover:text-white text-sm">
          ← Home
        </Link>
      </div>

      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Simple Pricing</h1>
        <p className="text-gray-400 text-lg">Start free. Upgrade when you need more.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
        <PlanCard
          name="Free"
          price="₹0"
          features={[
            "Unlimited public repos",
            "1 private repo",
            "Shareable links",
            "Last 10 changelogs",
          ]}
          cta="Get started"
          onCta={() => signIn("github")}
          highlighted={false}
        />

        <PlanCard
          name="Pro"
          price="₹199/mo"
          features={[
            "Everything in Free",
            "Unlimited private repos",
            "Up to 1 year of commits",
            "Download Markdown / PDF",
            "Priority generation",
          ]}
          cta={loading ? "..." : "Upgrade to Pro"}
          onCta={subscribe}
          highlighted={true}
          loading={loading}
        />
      </div>

      {error && (
        <p className="text-center text-red-400 text-sm mt-6">{error}</p>
      )}

      <p className="text-center text-gray-500 text-sm mt-8">
        Self-hosting? Bring your own API keys — no limits.{" "}
        <a href="https://github.com" className="text-indigo-400 hover:underline">
          Fork on GitHub
        </a>
      </p>
    </main>
  );
}

function PlanCard({
  name,
  price,
  features,
  cta,
  onCta,
  highlighted,
  loading,
}: {
  name: string;
  price: string;
  features: string[];
  cta: string;
  onCta: () => void;
  highlighted: boolean;
  loading?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-6 space-y-6 ${
        highlighted
          ? "bg-indigo-600 ring-2 ring-indigo-400"
          : "bg-gray-900 border border-gray-700"
      }`}
    >
      <div>
        <h2 className="text-xl font-bold">{name}</h2>
        <div className="text-3xl font-bold mt-2">{price}</div>
      </div>

      <ul className="space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm">
            <span className="text-green-400">✓</span>
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={onCta}
        disabled={loading}
        className={`w-full py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 ${
          highlighted
            ? "bg-white text-indigo-700 hover:bg-gray-100"
            : "bg-gray-800 hover:bg-gray-700 text-white"
        }`}
      >
        {cta}
      </button>
    </div>
  );
}
