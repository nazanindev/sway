"use client";

import { useState } from "react";
import type { Board, Option } from "@/lib/supabase/types";

interface OptionDraft {
  id: string;
  title: string;
  notes: string;
  link_url: string;
  image_url: string;
}

interface Props {
  board: Pick<Board, "id" | "title" | "description" | "expires_at">;
  initialOptions: Option[];
}

function toOptionDraft(o: Option): OptionDraft {
  return {
    id: o.id,
    title: o.title,
    notes: o.notes ?? "",
    link_url: o.link_url ?? "",
    image_url: o.image_url ?? "",
  };
}

export default function EditClient({ board, initialOptions }: Props) {
  const [title, setTitle] = useState(board.title);
  const [description, setDescription] = useState(board.description ?? "");
  const [options, setOptions] = useState<OptionDraft[]>(initialOptions.map(toOptionDraft));
  const [expanded, setExpanded] = useState<string | null>(null);
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

  function updateOption(id: string, field: keyof OptionDraft, value: string) {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, [field]: value } : o)));
  }

  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function save() {
    setSaving(true);
    setSaveState("idle");
    const token = getToken();
    try {
      const results = await Promise.all([
        fetch(`/api/boards/${board.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, title, description: description || null }),
        }),
        ...options.map((o) =>
          fetch(`/api/options/${o.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token,
              title: o.title,
              notes: o.notes || null,
              link_url: o.link_url || null,
              image_url: o.image_url || null,
            }),
          })
        ),
      ]);

      const allOk = results.every((r) => r.ok);
      if (!allOk) {
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

      <div className="space-y-4">
        {/* Board title + description */}
        <div className="rounded-2xl border border-[var(--border)] bg-white p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-1 block">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              disabled={isExpired}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-1 block">Description</label>
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
        </div>

        {/* Options */}
        <div>
          <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-2">Options</p>
          <div className="space-y-2">
            {options.map((o, i) => (
              <div key={o.id} className="rounded-xl border border-[var(--border)] bg-white overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="text-[var(--muted)] text-sm w-5 shrink-0">{i + 1}</span>
                  <input
                    value={o.title}
                    onChange={(e) => updateOption(o.id, "title", e.target.value)}
                    maxLength={80}
                    disabled={isExpired}
                    className="flex-1 bg-transparent text-sm font-medium outline-none disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                    className="text-xs text-[var(--muted)] hover:text-[var(--text)] px-1"
                  >
                    {expanded === o.id ? "less" : "more"}
                  </button>
                </div>

                {expanded === o.id && (
                  <div className="border-t border-[var(--border)] px-4 py-3 space-y-2 bg-gray-50">
                    <input
                      type="url"
                      value={o.link_url}
                      onChange={(e) => updateOption(o.id, "link_url", e.target.value)}
                      placeholder="Link URL (optional)"
                      disabled={isExpired}
                      className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
                    />
                    <div className="flex gap-2 items-center">
                      <input
                        type="url"
                        value={o.image_url}
                        onChange={(e) => updateOption(o.id, "image_url", e.target.value)}
                        placeholder="Image URL (optional)"
                        disabled={isExpired}
                        className="flex-1 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
                      />
                      {o.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={o.image_url}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover border border-[var(--border)] shrink-0"
                          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                        />
                      )}
                    </div>
                    <input
                      type="text"
                      value={o.notes}
                      onChange={(e) => updateOption(o.id, "notes", e.target.value)}
                      placeholder="Notes (optional)"
                      maxLength={300}
                      disabled={isExpired}
                      className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {!isExpired && (
            <button
              onClick={save}
              disabled={saving || !title.trim() || options.some((o) => !o.title.trim())}
              className="w-full rounded-xl bg-[var(--accent)] text-white py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : saveState === "saved" ? "Saved!" : saveState === "error" ? "Error — try again" : "Save changes"}
            </button>
          )}
          <button
            onClick={copyLink}
            className="w-full rounded-xl border border-[var(--border)] py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            {copied ? "Copied!" : "Copy share link"}
          </button>
          <a
            href={`/b/${board.id}`}
            className="block text-center text-sm text-[var(--accent)] hover:underline"
          >
            View board →
          </a>
        </div>
      </div>
    </main>
  );
}
