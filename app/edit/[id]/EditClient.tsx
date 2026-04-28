"use client";

import { useState, useCallback, useRef } from "react";
import type { Board, Option } from "@/lib/supabase/types";

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

interface OptionDraft {
  id: string;
  title: string;
  notes: string;
  link_url: string;
  image_url: string;
  fetchingPreview?: boolean;
  isNew?: boolean;
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

function newDraft(): OptionDraft {
  return { id: `new-${Date.now()}`, title: "", notes: "", link_url: "", image_url: "", isNew: true };
}

export default function EditClient({ board, initialOptions }: Props) {
  const [title, setTitle] = useState(board.title);
  const [description, setDescription] = useState(board.description ?? "");
  const [options, setOptions] = useState<OptionDraft[]>(initialOptions.map(toOptionDraft));
  const [toDelete, setToDelete] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [copied, setCopied] = useState(false);
  const previewTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const publicUrl = `/b/${board.id}`;
  const isExpired = new Date(board.expires_at) < new Date();
  const visibleOptions = options.filter((o) => !toDelete.has(o.id));

  function getToken() {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("token") ?? "";
  }

  function updateOption(id: string, field: keyof OptionDraft, value: string) {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, [field]: value } : o)));
  }

  function addOption() {
    const draft = newDraft();
    setOptions((prev) => [...prev, draft]);
    setExpanded(draft.id);
  }

  function removeOption(id: string) {
    if (visibleOptions.length <= 1) return;
    setToDelete((prev) => new Set(Array.from(prev).concat(id)));
    if (expanded === id) setExpanded(null);
  }

  const fetchOgPreview = useCallback(async (id: string, url: string) => {
    if (!url.startsWith("http")) return;
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, fetchingPreview: true } : o)));
    try {
      const res = await fetch(`/api/og-preview?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const data = await res.json();
        setOptions((prev) =>
          prev.map((o) => {
            if (o.id !== id) return o;
            return {
              ...o,
              fetchingPreview: false,
              image_url: o.image_url || data.image || o.image_url,
              title: o.title || data.title || o.title,
            };
          })
        );
      }
    } catch {
      setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, fetchingPreview: false } : o)));
    }
  }, []);

  function handleLinkChange(id: string, value: string) {
    updateOption(id, "link_url", value);
    clearTimeout(previewTimers.current[id]);
    if (value.startsWith("http")) {
      previewTimers.current[id] = setTimeout(() => fetchOgPreview(id, value), 800);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.origin + publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function save() {
    setSaving(true);
    setSaveError(false);
    const token = getToken();
    try {
      const existing = visibleOptions.filter((o) => !o.isNew);
      const created = visibleOptions.filter((o) => o.isNew);
      const deleted = Array.from(toDelete).filter((id) => !id.startsWith("new-"));

      const results = await Promise.all([
        fetch(`/api/boards/${board.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, title, description: description || null }),
        }),
        ...existing.map((o) =>
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
        ...created.map((o) =>
          fetch(`/api/options`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token,
              board_id: board.id,
              title: o.title,
              notes: o.notes || null,
              link_url: o.link_url || null,
              image_url: o.image_url || null,
            }),
          })
        ),
        ...deleted.map((id) =>
          fetch(`/api/options/${id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          })
        ),
      ]);

      if (results.every((r) => r.ok)) {
        window.location.href = publicUrl;
      } else {
        setSaveError(true);
      }
    } catch {
      setSaveError(true);
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
            {visibleOptions.map((o, i) => (
              <div key={o.id} className="rounded-xl border border-[var(--border)] bg-white overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="text-[var(--muted)] text-sm w-5 shrink-0">{i + 1}</span>
                  <input
                    value={o.title}
                    onChange={(e) => updateOption(o.id, "title", e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    maxLength={80}
                    disabled={isExpired}
                    className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-gray-300 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                    className="text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer p-1"
                    aria-label={expanded === o.id ? "Collapse option" : "Expand option"}
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expanded === o.id ? "rotate-180" : ""}`} />
                  </button>
                  {visibleOptions.length > 1 && !isExpired && (
                    <button
                      type="button"
                      onClick={() => removeOption(o.id)}
                      className="text-[var(--muted)] hover:text-red-500 transition-colors cursor-pointer p-1"
                      aria-label="Remove option"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {expanded === o.id && (
                  <div className="border-t border-[var(--border)] px-4 py-3 space-y-2 bg-gray-50">
                    <div className="relative">
                      <input
                        type="url"
                        value={o.link_url}
                        onChange={(e) => handleLinkChange(o.id, e.target.value)}
                        placeholder="Link URL (paste to auto-preview)"
                        disabled={isExpired}
                        className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
                      />
                      {o.fetchingPreview && (
                        <span className="absolute right-3 top-2 text-xs text-[var(--muted)] animate-pulse">fetching…</span>
                      )}
                    </div>
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
                          key={o.image_url}
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

            {visibleOptions.length < 6 && !isExpired && (
              <button
                type="button"
                onClick={addOption}
                className="w-full rounded-xl border-2 border-dashed border-[var(--border)] py-2 text-sm text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
              >
                + Add option
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {!isExpired && (
            <button
              onClick={save}
              disabled={saving || !title.trim() || visibleOptions.some((o) => !o.title.trim())}
              className="w-full rounded-xl bg-[var(--accent)] text-white py-2.5 text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : saveError ? "Error — try again" : "Save & view board →"}
            </button>
          )}
          <button
            onClick={copyLink}
            className="w-full rounded-xl border border-[var(--border)] py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
          >
            {copied ? "Copied!" : "Copy share link"}
          </button>
        </div>
      </div>
    </main>
  );
}
