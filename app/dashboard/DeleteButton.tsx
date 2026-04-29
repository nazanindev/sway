"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteButton({ boardId }: { boardId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:border-red-300 hover:text-red-500 transition-colors"
      >
        Delete
      </button>
    );
  }

  return (
    <button
      onClick={async () => {
        setLoading(true);
        await fetch(`/api/boards/${boardId}`, { method: "DELETE" });
        router.refresh();
      }}
      onBlur={() => { if (!loading) setConfirming(false); }}
      disabled={loading}
      autoFocus
      className="text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-500 bg-red-50 font-medium transition-colors disabled:opacity-50"
    >
      {loading ? "…" : "Confirm delete"}
    </button>
  );
}
