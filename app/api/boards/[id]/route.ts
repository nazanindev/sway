import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const db = getServiceClient();
  const { id } = params;

  const { data: board, error: boardErr } = await db
    .from("boards")
    .select("id, title, description, expires_at, created_at")
    .eq("id", id)
    .single();

  if (boardErr || !board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const { data: options } = await db
    .from("options")
    .select("*")
    .eq("board_id", id)
    .order("position");

  const optionIds = (options ?? []).map((o) => o.id);

  const [{ data: reactions }, { data: comments }] = await Promise.all([
    db.from("reactions").select("option_id, emoji, user_id").in("option_id", optionIds),
    db.from("comments").select("id, option_id, user_name, body, created_at").in("option_id", optionIds).order("created_at"),
  ]);

  // Aggregate reaction counts: { [optionId]: { [emoji]: count } }
  const reactionCounts: Record<string, Record<string, number>> = {};
  for (const r of reactions ?? []) {
    reactionCounts[r.option_id] ??= {};
    reactionCounts[r.option_id][r.emoji] = (reactionCounts[r.option_id][r.emoji] ?? 0) + 1;
  }

  const commentsByOption: Record<string, typeof comments> = {};
  for (const c of comments ?? []) {
    commentsByOption[c.option_id] ??= [];
    commentsByOption[c.option_id]!.push(c);
  }

  const enrichedOptions = (options ?? []).map((o) => ({
    ...o,
    reactions: reactionCounts[o.id] ?? {},
    comments: commentsByOption[o.id] ?? [],
  }));

  return NextResponse.json({ board, options: enrichedOptions });
}
