"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { REACTION_EMOJI_PRESETS } from "@/lib/reaction-emojis";

interface OptionDraft {
  title: string;
  image_url: string;
  link_url: string;
  notes: string;
}

interface OgPreview {
  image: string | null;
  title: string | null;
  description: string | null;
}

const emptyOption = (): OptionDraft => ({ title: "", image_url: "", link_url: "", notes: "" });

const EXPIRY_OPTIONS = [
  { label: "1 hour", value: "1h", price: null },
  { label: "6 hours", value: "6h", price: null },
  { label: "24 hours", value: "24h", price: null },
  { label: "3 days", value: "3d", price: null },
  { label: "7 days", value: "7d", price: null },
  { label: "30 days", value: "30d", price: "$1.99" },
  { label: "60 days", value: "60d", price: "$3.99" },
];

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

export default function HomePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [boardExpanded, setBoardExpanded] = useState(false);
  const [options, setOptions] = useState<OptionDraft[]>([emptyOption(), emptyOption()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [expiresIn, setExpiresIn] = useState("7d");
  const [emojiPreset, setEmojiPreset] = useState(0);
  const [previews, setPreviews] = useState<Record<number, OgPreview & { fetching?: boolean }>>({});
  const previewTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  function updateOption(i: number, field: keyof OptionDraft, value: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? { ...o, [field]: value } : o)));
  }

  function addOption() {
    if (options.length < 6) setOptions((prev) => [...prev, emptyOption()]);
  }

  function removeOption(i: number) {
    if (options.length > 1) {
      setOptions((prev) => prev.filter((_, idx) => idx !== i));
      setPreviews((prev) => {
        const next: typeof prev = {};
        Object.entries(prev).forEach(([k, v]) => {
          const ki = Number(k);
          if (ki < i) next[ki] = v;
          else if (ki > i) next[ki - 1] = v;
        });
        return next;
      });
    }
  }

  const fetchOgPreview = useCallback(async (i: number, url: string) => {
    if (!url.startsWith("http")) return;
    setPreviews((p) => ({ ...p, [i]: { ...p[i], fetching: true, image: null, title: null, description: null } }));
    try {
      const res = await fetch(`/api/og-preview?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const data: OgPreview = await res.json();
        setPreviews((p) => ({ ...p, [i]: { ...data, fetching: false } }));
        setOptions((prev) =>
          prev.map((o, idx) => {
            if (idx !== i) return o;
            return {
              ...o,
              image_url: o.image_url || data.image || "",
              title: o.title || data.title || "",
            };
          })
        );
      }
    } catch {
      setPreviews((p) => ({ ...p, [i]: { image: null, title: null, description: null, fetching: false } }));
    }
  }, []);

  function handleLinkChange(i: number, value: string) {
    updateOption(i, "link_url", value);
    clearTimeout(previewTimers.current[i]);
    if (value.startsWith("http")) {
      previewTimers.current[i] = setTimeout(() => fetchOgPreview(i, value), 800);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const filled = options.filter((o) => o.title.trim());
    if (filled.length < 1) {
      setError("Add at least 1 option.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          expires_in: expiresIn,
          emoji_set: [...REACTION_EMOJI_PRESETS[emojiPreset]],
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

      localStorage.setItem(`edit:${data.boardId}`, data.editUrl);

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

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
        <h1 className="text-3xl font-bold tracking-tight">Don&apos;t decide alone.</h1>
        <p className="text-[var(--muted)] mt-1.5 text-base">Share a link, let your friends pick for you.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Board title */}
        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="board-title">
            What are you deciding? <span className="text-[var(--accent)]">*</span>
          </label>
          <div className="rounded-xl border border-[var(--border)] bg-white shadow-[var(--shadow-sm)] overflow-hidden">
            <div className="flex items-center gap-2 px-4">
              <input
                id="board-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Which apartment? Best logo? Dinner spot?"
                required
                maxLength={120}
                autoComplete="off"
                className="flex-1 py-3 text-base outline-none bg-transparent placeholder:text-zinc-300"
              />
              <button
                type="button"
                onClick={() => setBoardExpanded((v) => !v)}
                className="text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer shrink-0 p-1"
                aria-label={boardExpanded ? "Hide description" : "Add description"}
              >
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${boardExpanded ? "rotate-180" : ""}`} />
              </button>
            </div>
            {boardExpanded && (
              <div className="border-t border-[var(--border)] px-4 py-3 bg-zinc-50/60">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description (optional)"
                  maxLength={300}
                  rows={2}
                  className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm resize-none outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-shadow"
                />
              </div>
            )}
          </div>
        </div>

        {/* Emoji preset picker */}
        <div>
          <p className="text-sm font-medium mb-1.5">Reaction style</p>
          <div className="flex flex-wrap gap-2">
            {REACTION_EMOJI_PRESETS.map((preset, i) => (
              <button
                key={`reaction-preset-${preset.join("-")}`}
                type="button"
                onClick={() => setEmojiPreset(i)}
                title={preset.join(" ")}
                className={`rounded-xl border px-3 py-2.5 text-center transition-all duration-150 cursor-pointer w-[calc(33.333%-6px)] sm:flex-1
                  ${emojiPreset === i
                    ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)] font-medium shadow-[var(--shadow-sm)]"
                    : "border-[var(--border)] bg-white hover:border-[var(--accent)] hover:bg-[var(--accent-light)]/50"
                  }`}
              >
                <span className="block text-lg leading-none tracking-tight">
                  {preset.join("")}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Options</p>
          {options.map((opt, i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--border)] bg-white shadow-[var(--shadow-sm)] overflow-hidden"
            >
              <div className="flex items-center gap-2 px-3 py-2.5">
                <span className="text-[var(--muted)] text-sm w-5 shrink-0 select-none font-medium">{i + 1}</span>
                <input
                  type="text"
                  value={opt.title}
                  onChange={(e) => updateOption(i, "title", e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  maxLength={80}
                  className="flex-1 bg-transparent text-base outline-none placeholder:text-zinc-300"
                />
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  className="text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer p-1"
                  aria-label={expanded === i ? "Collapse option" : "Expand option"}
                >
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expanded === i ? "rotate-180" : ""}`} />
                </button>
                {options.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="text-[var(--muted)] hover:text-red-500 transition-colors cursor-pointer p-1"
                    aria-label="Remove option"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              {expanded === i && (
                <div className="border-t border-[var(--border)] px-4 py-3 space-y-2 bg-zinc-50/60">
                  <div className="relative">
                    <input
                      type="url"
                      value={opt.link_url}
                      onChange={(e) => handleLinkChange(i, e.target.value)}
                      placeholder="Link URL (paste to auto-preview)"
                      className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-shadow"
                    />
                    {previews[i]?.fetching && (
                      <span className="absolute right-3 top-2 text-xs text-[var(--muted)] animate-pulse">
                        fetching…
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 items-start">
                    <input
                      type="url"
                      value={opt.image_url}
                      onChange={(e) => updateOption(i, "image_url", e.target.value)}
                      placeholder="Image URL (optional)"
                      className="flex-1 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-shadow"
                    />
                    {opt.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={opt.image_url}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover border border-[var(--border)] shrink-0"
                        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                      />
                    )}
                  </div>

                  <input
                    type="text"
                    value={opt.notes}
                    onChange={(e) => updateOption(i, "notes", e.target.value)}
                    placeholder="Notes (optional)"
                    maxLength={300}
                    className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-shadow"
                  />
                </div>
              )}
            </div>
          ))}

          {options.length < 6 && (
            <button
              type="button"
              onClick={addOption}
              className="w-full rounded-xl border-2 border-dashed border-[var(--border)] py-3 text-sm text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-light)]/40 transition-all duration-150 cursor-pointer font-medium"
            >
              + Add option
            </button>
          )}
        </div>

        {/* Expiry */}
        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="expires-in">
            Voting closes in
          </label>
          <select
            id="expires-in"
            value={expiresIn}
            onChange={(e) => setExpiresIn(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-white shadow-[var(--shadow-sm)] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] cursor-pointer transition-shadow"
          >
            {EXPIRY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}{o.price ? ` — ${o.price}` : ""}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-sm text-red-500" role="alert">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="w-full rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold py-3 text-base shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] disabled:opacity-40 transition-all duration-150 cursor-pointer"
        >
          {loading
            ? (expiresIn === "30d" || expiresIn === "60d" ? "Redirecting to checkout…" : "Creating…")
            : (expiresIn === "30d" || expiresIn === "60d"
                ? `Create & pay ${EXPIRY_OPTIONS.find(o => o.value === expiresIn)?.price} →`
                : "Create board →")}
        </button>
      </form>
    </main>
  );
}
