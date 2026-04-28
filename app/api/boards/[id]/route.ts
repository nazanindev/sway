import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { rateLimit, getIp } from "@/lib/rate-limit";

const MAX_TITLE_LEN = 120;
const MAX_NOTES_LEN = 300;

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

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ip = getIp(req);
  if (!rateLimit(`boards-patch:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { token, title, description } = body as Record<string, unknown>;

  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }
  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (title.trim().length > MAX_TITLE_LEN) {
    return NextResponse.json({ error: "title too long" }, { status: 400 });
  }
  if (typeof description === "string" && description.length > MAX_NOTES_LEN) {
    return NextResponse.json({ error: "description too long" }, { status: 400 });
  }

  const db = getServiceClient();
  const { data: board } = await db
    .from("boards")
    .select("edit_token")
    .eq("id", params.id)
    .single();

  if (!board || board.edit_token !== token) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  const { error } = await db
    .from("boards")
    .update({
      title: title.trim(),
      description: typeof description === "string" ? description.trim() || null : null,
    })
    .eq("id", params.id);

  if (error) {
    console.error("[boards patch] update error:", error);
    return NextResponse.json({ error: "Failed to update board" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
