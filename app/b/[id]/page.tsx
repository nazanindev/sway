import { getServiceClient } from "@/lib/supabase/server";
import BoardClient from "./BoardClient";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function BoardPage({ params, searchParams }: {
  params: { id: string };
  searchParams: { created?: string; extended?: string };
}) {
  const db = getServiceClient();

  const { data: board } = await db
    .from("boards")
    .select("id, title, description, expires_at, created_at")
    .eq("id", params.id)
    .single();

  if (!board) notFound();

  const { data: options } = await db
    .from("options")
    .select("*")
    .eq("board_id", params.id)
    .order("position");

  const optionIds = (options ?? []).map((o) => o.id);

  const [{ data: reactions }, { data: comments }, { data: votes }] = await Promise.all([
    db.from("reactions").select("option_id, emoji, user_id").in("option_id", optionIds),
    db.from("comments").select("id, option_id, user_name, body, created_at").in("option_id", optionIds).order("created_at"),
    db.from("votes").select("option_id, user_id").eq("board_id", params.id),
  ]);

  const reactionCounts: Record<string, Record<string, number>> = {};
  const reactionUsers: Record<string, Record<string, string[]>> = {};

  for (const r of reactions ?? []) {
    reactionCounts[r.option_id] ??= {};
    reactionCounts[r.option_id][r.emoji] = (reactionCounts[r.option_id][r.emoji] ?? 0) + 1;
    reactionUsers[r.option_id] ??= {};
    reactionUsers[r.option_id][r.emoji] ??= [];
    reactionUsers[r.option_id][r.emoji].push(r.user_id);
  }

  const commentsByOption: Record<string, typeof comments> = {};
  for (const c of comments ?? []) {
    commentsByOption[c.option_id] ??= [];
    commentsByOption[c.option_id]!.push(c);
  }

  const voteCounts: Record<string, number> = {};
  const votersByOption: Record<string, string[]> = {};
  for (const v of votes ?? []) {
    voteCounts[v.option_id] = (voteCounts[v.option_id] ?? 0) + 1;
    votersByOption[v.option_id] ??= [];
    votersByOption[v.option_id].push(v.user_id);
  }

  const enriched = (options ?? []).map((o) => ({
    ...o,
    reactions: reactionCounts[o.id] ?? {},
    reactionUsers: reactionUsers[o.id] ?? {},
    comments: commentsByOption[o.id] ?? [],
    voteCount: voteCounts[o.id] ?? 0,
    voters: votersByOption[o.id] ?? [],
  }));

  return (
    <BoardClient
      board={board}
      initialOptions={enriched}
      justCreated={!!searchParams.created}
      justExtended={!!searchParams.extended}
    />
  );
}
