"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface OptionDraft {
  title: string;
  image_url: string;
  link_url: string;
  notes: string;
}

const emptyOption = (): OptionDraft => ({ title: "", image_url: "", link_url: "", notes: "" });

export default function HomePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState<OptionDraft[]>([emptyOption(), emptyOption()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  function updateOption(i: number, field: keyof OptionDraft, value: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? { ...o, [field]: value } : o)));
  }

  function addOption() {
    if (options.length < 6) setOptions((prev) => [...prev, emptyOption()]);
  }

  function removeOption(i: number) {
    if (options.length > 2) setOptions((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const filled = options.filter((o) => o.title.trim());
    if (filled.length < 2) {
      setError("Add at least 2 options.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          options: filled.map((o) => ({
            title: o.title.trim(),
            image_url: o.image_url.trim() || null,
            link_url: o.link_url.trim() || null,
            notes: o.notes.trim() || null,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      // Save edit URL to localStorage so creator can return
      localStorage.setItem(`edit:${data.boardId}`, data.editUrl);

      // Auto-copy public link
      try {
        await navigator.clipboard.writeText(window.location.origin + data.publicUrl);
      } catch {}

      router.push(data.publicUrl + "?created=1");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Sway</h1>
        <p className="text-[var(--muted)] mt-1">Make group decisions in seconds.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Board title */}
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="board-title">
            What are you deciding?
          </label>
          <input
            id="board-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Which apartment? Best logo? Dinner spot?"
            required
            maxLength={120}
            className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        {/* Options */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Options</p>
          {options.map((opt, i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--border)] bg-white overflow-hidden"
            >
              <div className="flex items-center gap-2 px-3 py-2">
                <span className="text-[var(--muted)] text-sm w-5 shrink-0">{i + 1}</span>
                <input
                  type="text"
                  value={opt.title}
                  onChange={(e) => updateOption(i, "title", e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  maxLength={80}
                  className="flex-1 bg-transparent text-base outline-none placeholder:text-gray-300"
                />
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  className="text-xs text-[var(--muted)] hover:text-[var(--text)] px-1"
                  aria-label="Toggle extra fields"
                >
                  {expanded === i ? "less" : "more"}
                </button>
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="text-[var(--muted)] hover:text-red-500 text-lg leading-none px-1"
                    aria-label="Remove option"
                  >
                    ×
                  </button>
                )}
              </div>

              {expanded === i && (
                <div className="border-t border-[var(--border)] px-4 py-3 space-y-2 bg-gray-50">
                  <input
                    type="url"
                    value={opt.image_url}
                    onChange={(e) => updateOption(i, "image_url", e.target.value)}
                    placeholder="Image URL (optional)"
                    className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                  <input
                    type="url"
                    value={opt.link_url}
                    onChange={(e) => updateOption(i, "link_url", e.target.value)}
                    placeholder="Link URL (optional)"
                    className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                  <input
                    type="text"
                    value={opt.notes}
                    onChange={(e) => updateOption(i, "notes", e.target.value)}
                    placeholder="Notes (optional)"
                    maxLength={300}
                    className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>
              )}
            </div>
          ))}

          {options.length < 6 && (
            <button
              type="button"
              onClick={addOption}
              className="w-full rounded-xl border-2 border-dashed border-[var(--border)] py-2 text-sm text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
            >
              + Add option
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="w-full rounded-xl bg-[var(--accent)] text-white font-semibold py-3 text-base hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {loading ? "Creating…" : "Create board & copy link"}
        </button>
      </form>
    </main>
  );
}
