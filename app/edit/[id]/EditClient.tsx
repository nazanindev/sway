"use client";

import { useState } from "react";
import type { Board, Option } from "@/lib/supabase/types";

// Edit page is a future extension — for MVP it just shows the board link + basic info.
// Full option editing (add/remove/reorder) can be wired to a PATCH /api/boards/:id route later.

interface Props {
  board: Pick<Board, "id" | "title" | "description" | "expires_at">;
  initialOptions: Option[];
}

export default function EditClient({ board, initialOptions }: Props) {
  const [copied, setCopied] = useState(false);
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = `${base}/b/${board.id}`;
  const isExpired = new Date(board.expires_at) < new Date();

  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <a href="/" className="text-sm text-[var(--muted)] hover:underline">← Sway</a>

      <h1 className="text-2xl font-bold mt-4 mb-1">Your board</h1>
      <p className="text-[var(--muted)] text-sm mb-6">
        {isExpired ? "This board has expired." : `Expires ${new Date(board.expires_at).toLocaleDateString()}.`}
      </p>

      <div className="rounded-2xl border border-[var(--border)] bg-white p-5 space-y-4">
        <div>
          <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-1">Title</p>
          <p className="font-semibold">{board.title}</p>
        </div>

        {board.description && (
          <div>
            <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-1">Description</p>
            <p className="text-sm">{board.description}</p>
          </div>
        )}

        <div>
          <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-2">Options</p>
          <ul className="space-y-1">
            {initialOptions.map((o) => (
              <li key={o.id} className="text-sm flex items-center gap-2">
                <span className="text-[var(--muted)]">·</span>
                {o.title}
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-2">
          <button
            onClick={copyLink}
            className="w-full rounded-xl border border-[var(--border)] py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            {copied ? "Copied!" : "Copy share link"}
          </button>
          <a
            href={`/b/${board.id}`}
            className="mt-2 block text-center text-sm text-[var(--accent)] hover:underline"
          >
            View board →
          </a>
        </div>
      </div>
    </main>
  );
}
