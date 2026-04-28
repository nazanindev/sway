"use client";

import { useState } from "react";
import type { Board, Option } from "@/lib/supabase/types";

interface Props {
  board: Pick<Board, "id" | "title" | "description" | "expires_at">;
  initialOptions: Option[];
}

export default function EditClient({ board, initialOptions }: Props) {
  const [title, setTitle] = useState(board.title);
  const [description, setDescription] = useState(board.description ?? "");
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [copied, setCopied] = useState(false);

  const base = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = `${base}/b/${board.id}`;
  const isExpired = new Date(board.expires_at) < new Date();

  function getToken() {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("token") ?? "";
  }

  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function save() {
    setSaving(true);
    setSaveState("idle");
    try {
      const res = await fetch(`/api/boards/${board.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: getToken(), title, description: description || null }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        console.error("[edit] save failed:", error);
        setSaveState("error");
      } else {
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2500);
      }
    } catch {
      setSaveState("error");
    } finally {
      setSaving(false);
    }
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
          <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-1 block">
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            disabled={isExpired}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-1 block">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={300}
            rows={2}
            disabled={isExpired}
            placeholder="Optional"
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm resize-none focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
          />
        </div>

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

        {!isExpired && (
          <div className="pt-1">
            <button
              onClick={save}
              disabled={saving || !title.trim()}
              className="w-full rounded-xl bg-[var(--accent)] text-white py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : saveState === "saved" ? "Saved!" : saveState === "error" ? "Error — try again" : "Save changes"}
            </button>
          </div>
        )}

        <div className={isExpired ? "pt-2" : ""}>
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
