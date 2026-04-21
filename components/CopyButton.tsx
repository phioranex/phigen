"use client";

export function CopyButton({ url }: { url: string }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(url)}
      className="text-sm text-gray-400 hover:text-white border border-gray-700 px-3 py-1.5 rounded-lg transition-colors"
    >
      Copy link
    </button>
  );
}
