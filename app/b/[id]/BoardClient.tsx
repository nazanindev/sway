"use client";

import { useEffect, useState, useRef } from "react";
import { getUserId } from "@/lib/user-id";
import { supabase } from "@/lib/supabase/client";
import type { Board, Option, Comment } from "@/lib/supabase/types";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

const EMOJIS = ["❤️", "🔥", "🤔", "❌"] as const;

type EnrichedOption = Option & {
  reactions: Record<string, number>;
  reactionUsers: Record<string, string[]>;
  comments: (Comment & { option_id: string })[];
  voteCount: number;
  voters: string[];
};

interface Props {
  board: Pick<Board, "id" | "title" | "description" | "expires_at" | "created_at">;
  initialOptions: EnrichedOption[];
  justCreated: boolean;
  justExtended: boolean;
}

function getTimeLeft(expiresAt: string): string | null {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `Closes in ${minutes}m`;
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 24) return `Closes in ${hours}h`;
  const days = Math.ceil(ms / 86_400_000);
  return `${days}d left`;
}

export default function BoardClient({ board, initialOptions, justCreated, justExtended }: Props) {
  const [options, setOptions] = useState(initialOptions);
  const [userId, setUserId] = useState("");
  const [copied, setCopied] = useState(justCreated);
  const [editUrl, setEditUrl] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(board.expires_at));

  const isClosed = new Date(board.expires_at) < new Date();

  useEffect(() => {
    setUserId(getUserId());
    setEditUrl(localStorage.getItem(`edit:${board.id}`));

    // Load persistent display name: prefer auth metadata, fall back to localStorage
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata?.display_name as string | undefined;
      if (meta) {
        setDisplayName(meta);
      } else {
        const saved = localStorage.getItem("sway_display_name") ?? "";
        setDisplayName(saved);
      }
    });
  }, [board.id]);

  // Realtime subscriptions
  useEffect(() => {
    const optionIds = new Set(initialOptions.map((o) => o.id));
    const channel = supabase.channel(`board:${board.id}`);

    // Reactions (INSERT and DELETE)
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "reactions" },
      (payload: RealtimePostgresChangesPayload<{ option_id: string; emoji: string; user_id: string }>) => {
        const r = (payload.new && Object.keys(payload.new).length > 0 ? payload.new : payload.old) as {
          option_id: string;
          emoji: string;
          user_id: string;
        };
        if (!r || !optionIds.has(r.option_id)) return;
        setOptions((prev) =>
          prev.map((o) => {
            if (o.id !== r.option_id) return o;
            const currentUsers = o.reactionUsers[r.emoji] ?? [];
            const newUsers =
              payload.eventType === "INSERT"
                ? [...currentUsers.filter((u) => u !== r.user_id), r.user_id]
                : currentUsers.filter((u) => u !== r.user_id);
            return {
              ...o,
              reactions: { ...o.reactions, [r.emoji]: newUsers.length },
              reactionUsers: { ...o.reactionUsers, [r.emoji]: newUsers },
            };
          })
        );
      }
    );

    // Comments (INSERT only)
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "comments" },
      (payload: RealtimePostgresChangesPayload<Comment & { option_id: string }>) => {
        const c = payload.new as Comment & { option_id: string };
        if (!c || !optionIds.has(c.option_id)) return;
        setOptions((prev) =>
          prev.map((o) => {
            if (o.id !== c.option_id) return o;
            if (o.comments.some((existing) => existing.id === c.id)) return o;
            return { ...o, comments: [...o.comments, c] };
          })
        );
      }
    );

    // Votes (INSERT, UPDATE, DELETE)
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "votes" },
      (payload: RealtimePostgresChangesPayload<{ board_id: string; option_id: string; user_id: string }>) => {
        const newVote = payload.new && Object.keys(payload.new).length > 0
          ? (payload.new as { board_id: string; option_id: string; user_id: string })
          : null;
        const oldVote = payload.old && Object.keys(payload.old).length > 0
          ? (payload.old as { board_id: string; option_id: string; user_id: string })
          : null;
        if (newVote?.board_id !== board.id && oldVote?.board_id !== board.id) return;
        setOptions((prev) =>
          prev.map((o) => {
            let voters = [...o.voters];
            if (oldVote?.option_id === o.id) {
              voters = voters.filter((u) => u !== oldVote.user_id);
            }
            if (newVote?.option_id === o.id && !voters.includes(newVote.user_id)) {
              voters = [...voters, newVote.user_id];
            }
            return { ...o, voteCount: voters.length, voters };
          })
        );
      }
    );

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [board.id, initialOptions]);

  // Live countdown ticker
  useEffect(() => {
    if (isClosed) return;
    const t = setInterval(() => setTimeLeft(getTimeLeft(board.expires_at)), 30_000);
    return () => clearInterval(t);
  }, [board.expires_at, isClosed]);

  // Auto-clear "copied" banner
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 3000);
    return () => clearTimeout(t);
  }, [copied]);

  const maxVoteCount = Math.max(0, ...options.map((o) => o.voteCount));
  const isPopular = (opt: EnrichedOption) => maxVoteCount > 0 && opt.voteCount === maxVoteCount;

  const myVotedOptionId = options.find((o) => o.voters.includes(userId))?.id ?? null;

  async function toggleReaction(optionId: string, emoji: string) {
    if (isClosed || !userId) return;

    // Capture previous state for rollback
    const prevOptions = options;

    setOptions((prev) =>
      prev.map((o) => {
        if (o.id !== optionId) return o;
        const had = o.reactionUsers[emoji]?.includes(userId);
        const users = had
          ? (o.reactionUsers[emoji] ?? []).filter((u) => u !== userId)
          : [...(o.reactionUsers[emoji] ?? []), userId];
        return {
          ...o,
          reactions: { ...o.reactions, [emoji]: users.length },
          reactionUsers: { ...o.reactionUsers, [emoji]: users },
        };
      })
    );

    const res = await fetch("/api/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ option_id: optionId, emoji, user_id: userId }),
    });

    if (!res.ok) {
      setOptions(prevOptions);
    }
  }

  async function castVote(optionId: string) {
    if (isClosed || !userId) return;

    const prevOptions = options;

    // Optimistic: remove from current voted option, add to new one
    setOptions((prev) =>
      prev.map((o) => {
        let count = o.voteCount;
        let voters = [...o.voters];
        if (o.voters.includes(userId)) {
          count = Math.max(0, count - 1);
          voters = voters.filter((u) => u !== userId);
        }
        if (o.id === optionId) {
          if (myVotedOptionId !== optionId) {
            count += 1;
            if (!voters.includes(userId)) voters.push(userId);
          }
        }
        return { ...o, voteCount: count, voters };
      })
    );

    let result: { action: string; from?: string } | null = null;
    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board_id: board.id, option_id: optionId, user_id: userId }),
      });
      if (!res.ok) {
        setOptions(prevOptions);
        return;
      }
      result = await res.json();
    } catch {
      setOptions(prevOptions);
      return;
    }

    // Reconcile client state with what the server actually did.
    // This corrects any divergence from race conditions or network delays.
    if (!result) return;
    setOptions((prev) =>
      prev.map((o) => {
        let voters = [...o.voters];
        if (result.action === "voted") {
          if (o.id === optionId) {
            if (!voters.includes(userId)) voters = [...voters, userId];
          } else {
            voters = voters.filter((u) => u !== userId);
          }
        } else if (result.action === "unvoted") {
          voters = voters.filter((u) => u !== userId);
        } else if (result.action === "moved") {
          if (o.id === result.from) voters = voters.filter((u) => u !== userId);
          if (o.id === optionId && !voters.includes(userId)) voters = [...voters, userId];
        }
        return { ...o, voteCount: voters.length, voters };
      })
    );
  }

  async function submitComment(optionId: string) {
    const body = commentInputs[optionId]?.trim();
    if (!body || submitting[optionId]) return;

    setSubmitting((s) => ({ ...s, [optionId]: true }));

    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        option_id: optionId,
        body,
        user_name: displayName.trim() || null,
      }),
    });

    if (res.ok) {
      const comment = await res.json();
      setOptions((prev) =>
        prev.map((o) =>
          o.id === optionId ? { ...o, comments: [...o.comments, comment] } : o
        )
      );
      setCommentInputs((c) => ({ ...c, [optionId]: "" }));

      // Persist the display name
      const trimmed = displayName.trim();
      if (trimmed) {
        localStorage.setItem("sway_display_name", trimmed);
        supabase.auth.getUser().then(({ data }) => {
          if (data.user) {
            supabase.auth.updateUser({ data: { display_name: trimmed } });
          }
        });
      }
    }

    setSubmitting((s) => ({ ...s, [optionId]: false }));
  }

  async function handleExtend() {
    setCheckoutLoading(true);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ board_id: board.id }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setCheckoutLoading(false);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href.split("?")[0]);
    setCopied(true);
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <a href="/" className="text-sm text-[var(--muted)] hover:underline">← Sway</a>
        <h1 className="text-2xl font-bold mt-2 leading-snug">{board.title}</h1>
        {board.description && <p className="text-[var(--muted)] text-sm mt-1">{board.description}</p>}

        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {!isClosed && timeLeft && (
            <span className="text-xs text-[var(--muted)]">{timeLeft}</span>
          )}
          {isClosed && (
            <span className="text-xs font-medium text-red-500">Closed</span>
          )}
          <button
            onClick={copyLink}
            className="text-xs px-3 py-1 rounded-full border border-[var(--border)] hover:bg-white transition-colors"
          >
            {copied ? "Link copied!" : "Send this Sway →"}
          </button>
          {editUrl && !isClosed && (
            <a
              href={editUrl}
              className="text-xs px-3 py-1 rounded-full border border-[var(--border)] hover:bg-white transition-colors"
            >
              Edit board
            </a>
          )}
        </div>
      </div>

      {justExtended && (
        <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          Sway reopened for 7 more days.
        </div>
      )}

      {/* Options */}
      <div className="space-y-4">
        {options.map((opt) => (
          <OptionCard
            key={opt.id}
            option={opt}
            userId={userId}
            isClosed={isClosed}
            isPopular={isPopular(opt)}
            myVotedOptionId={myVotedOptionId}
            commentInput={commentInputs[opt.id] ?? ""}
            commentName={displayName}
            isSubmitting={!!submitting[opt.id]}
            onReact={(emoji) => toggleReaction(opt.id, emoji)}
            onVote={() => castVote(opt.id)}
            onCommentChange={(v) => setCommentInputs((c) => ({ ...c, [opt.id]: v }))}
            onNameChange={setDisplayName}
            onCommentSubmit={() => submitComment(opt.id)}
          />
        ))}
      </div>

      {/* Closed CTA */}
      {isClosed && (
        <div className="mt-8 rounded-2xl border-2 border-dashed border-[var(--border)] p-6 text-center space-y-3">
          <p className="font-semibold">This Sway is closed</p>
          <p className="text-sm text-[var(--muted)]">Reopen it to collect more reactions.</p>
          <button
            onClick={handleExtend}
            disabled={checkoutLoading}
            className="rounded-xl bg-[var(--accent)] text-white font-semibold px-6 py-3 text-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {checkoutLoading ? "Loading…" : "Reopen this Sway · $1.99"}
          </button>
        </div>
      )}
    </main>
  );
}

// ─── OptionCard ───────────────────────────────────────────────────────────────

function OptionCard({
  option, userId, isClosed, isPopular, myVotedOptionId,
  commentInput, commentName, isSubmitting,
  onReact, onVote, onCommentChange, onNameChange, onCommentSubmit,
}: {
  option: EnrichedOption;
  userId: string;
  isClosed: boolean;
  isPopular: boolean;
  myVotedOptionId: string | null;
  commentInput: string;
  commentName: string;
  isSubmitting: boolean;
  onReact: (emoji: string) => void;
  onVote: () => void;
  onCommentChange: (v: string) => void;
  onNameChange: (v: string) => void;
  onCommentSubmit: () => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") onCommentSubmit();
  }

  const isMyVote = myVotedOptionId === option.id;
  const hasVotedElsewhere = myVotedOptionId !== null && !isMyVote;

  let voteLabel = "Vote for this";
  if (isMyVote) voteLabel = "✓ You voted";
  else if (hasVotedElsewhere) voteLabel = "Move vote here";

  return (
    <div className={`rounded-2xl border bg-white overflow-hidden transition-all ${isPopular ? "border-[var(--accent)] ring-1 ring-[var(--accent)]" : "border-[var(--border)]"}`}>
      {/* Image */}
      {option.image_url && (
        <div className="aspect-video w-full bg-gray-100 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={option.image_url}
            alt={option.title}
            className="w-full h-full object-cover"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
        </div>
      )}

      <div className="px-4 pt-4 pb-3">
        {/* Popular badge */}
        {isPopular && (
          <div className="mb-2 text-xs font-medium text-[var(--accent)]">
            {isClosed
              ? `${option.voteCount} ${option.voteCount === 1 ? "person" : "people"} picked this`
              : "Most popular"}
          </div>
        )}

        {/* Title + link */}
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold leading-snug">{option.title}</p>
          {option.link_url && (
            <a
              href={option.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--accent)] shrink-0 hover:underline"
            >
              View ↗
            </a>
          )}
        </div>
        {option.notes && <p className="text-sm text-[var(--muted)] mt-1">{option.notes}</p>}

        {/* Vote button */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-[var(--muted)] w-12 shrink-0">Vote</span>
          <button
            onClick={onVote}
            disabled={isClosed || !userId}
            className={`text-sm font-medium px-4 py-1.5 rounded-full border transition-all
              ${isMyVote
                ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                : "border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {voteLabel}
            {option.voteCount > 0 && (
              <span className="ml-1.5 opacity-70 tabular-nums">
                {option.voteCount}
              </span>
            )}
          </button>
        </div>

        {/* Emoji reactions */}
        <div className="mt-2 flex items-start gap-2">
          <span className="text-xs text-[var(--muted)] w-12 shrink-0 pt-1.5">React</span>
        <div className="flex gap-2 flex-wrap flex-1">
          {EMOJIS.map((emoji) => {
            const count = option.reactions[emoji] ?? 0;
            const reacted = option.reactionUsers[emoji]?.includes(userId);
            return (
              <button
                key={emoji}
                onClick={() => onReact(emoji)}
                disabled={isClosed}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border transition-all
                  ${reacted
                    ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                    : "border-[var(--border)] hover:border-[var(--accent)] hover:bg-blue-50"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span>{emoji}</span>
                {count > 0 && <span className="font-medium tabular-nums">{count}</span>}
              </button>
            );
          })}
        </div>
        </div>

        {/* Comments toggle */}
        <button
          onClick={() => {
            setShowComments((s) => !s);
            if (!showComments) setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className="mt-3 text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors"
        >
          {option.comments.length > 0
            ? `${option.comments.length} comment${option.comments.length !== 1 ? "s" : ""} · add yours`
            : isClosed ? `${option.comments.length} comments` : "Add a comment"}
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="border-t border-[var(--border)] px-4 pb-4 pt-3 space-y-3 bg-gray-50">
          {option.comments.map((c) => (
            <div key={c.id} className="text-sm">
              <span className="font-medium">{c.user_name || "Anonymous"}</span>
              <span className="text-[var(--muted)] mx-1">·</span>
              <span>{c.body}</span>
            </div>
          ))}
          {!isClosed && (
            <div className="space-y-1.5 mt-2">
              <input
                type="text"
                value={commentName}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Your name (optional)"
                maxLength={50}
                className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={commentInput}
                  onChange={(e) => onCommentChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a comment…"
                  maxLength={500}
                  className="flex-1 min-w-0 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
                <button
                  onClick={onCommentSubmit}
                  disabled={!commentInput.trim() || isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
                >
                  {isSubmitting ? "…" : "Send"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
