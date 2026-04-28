import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { rateLimit, getIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = getIp(req);
  if (!rateLimit(`votes:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { board_id, option_id, user_id } = body as Record<string, unknown>;

  if (typeof board_id !== "string" || typeof option_id !== "string" || typeof user_id !== "string") {
    return NextResponse.json({ error: "board_id, option_id, user_id required" }, { status: 400 });
  }
  if (!/^[0-9a-f-]{36}$/.test(user_id)) {
    return NextResponse.json({ error: "invalid user_id" }, { status: 400 });
  }

  const db = getServiceClient();

  // Verify board exists and is still open
  const { data: board } = await db
    .from("boards")
    .select("id, expires_at")
    .eq("id", board_id)
    .single();

  if (!board) {
    return NextResponse.json({ error: "board not found" }, { status: 404 });
  }
  if (board.expires_at && new Date(board.expires_at) < new Date()) {
    return NextResponse.json({ error: "Board is closed" }, { status: 403 });
  }

  // Verify option belongs to the board (prevents cross-board vote manipulation)
  const { data: option } = await db
    .from("options")
    .select("id")
    .eq("id", option_id)
    .eq("board_id", board_id)
    .single();

  if (!option) {
    return NextResponse.json({ error: "option not found" }, { status: 404 });
  }

  // Check for existing vote from this user on this board
  const { data: existing } = await db
    .from("votes")
    .select("id, option_id")
    .eq("board_id", board_id)
    .eq("user_id", user_id)
    .single();

  if (!existing) {
    // No vote yet — cast it
    const { error } = await db.from("votes").insert({ board_id, option_id, user_id });
    if (error) return NextResponse.json({ error: "Failed to save vote" }, { status: 500 });
    return NextResponse.json({ action: "voted" });
  }

  if (existing.option_id === option_id) {
    // Same option — remove vote (toggle off)
    const { error } = await db.from("votes").delete().eq("id", existing.id);
    if (error) return NextResponse.json({ error: "Failed to remove vote" }, { status: 500 });
    return NextResponse.json({ action: "unvoted" });
  }

  // Different option — move vote
  const { error } = await db.from("votes").update({ option_id }).eq("id", existing.id);
  if (error) return NextResponse.json({ error: "Failed to move vote" }, { status: 500 });
  return NextResponse.json({ action: "moved", from: existing.option_id });
}
