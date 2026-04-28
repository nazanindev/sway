import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { rateLimit, getIp } from "@/lib/rate-limit";
import { isValidUrl } from "@/lib/validate-url";

const MAX_OPTIONS = 6;
const MAX_TITLE_LEN = 80;
const MAX_NOTES_LEN = 300;

export async function POST(req: Request) {
  const ip = getIp(req);
  if (!rateLimit(`options-post:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { token, board_id, title, notes, link_url, image_url } = body as Record<string, unknown>;

  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }
  if (typeof board_id !== "string" || !board_id) {
    return NextResponse.json({ error: "Missing board_id" }, { status: 400 });
  }
  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (title.trim().length > MAX_TITLE_LEN) {
    return NextResponse.json({ error: "title too long" }, { status: 400 });
  }
  if (typeof notes === "string" && notes.length > MAX_NOTES_LEN) {
    return NextResponse.json({ error: "notes too long" }, { status: 400 });
  }
  if (!isValidUrl(link_url as string)) {
    return NextResponse.json({ error: "invalid link_url" }, { status: 400 });
  }
  if (!isValidUrl(image_url as string)) {
    return NextResponse.json({ error: "invalid image_url" }, { status: 400 });
  }

  const db = getServiceClient();

  const { data: board } = await db
    .from("boards")
    .select("edit_token")
    .eq("id", board_id)
    .single();

  if (!board || board.edit_token !== token) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  const { count } = await db
    .from("options")
    .select("id", { count: "exact", head: true })
    .eq("board_id", board_id);

  if ((count ?? 0) >= MAX_OPTIONS) {
    return NextResponse.json({ error: `Maximum ${MAX_OPTIONS} options allowed` }, { status: 400 });
  }

  const { data: option, error } = await db
    .from("options")
    .insert({
      board_id,
      title: title.trim(),
      notes: typeof notes === "string" ? notes.trim() || null : null,
      link_url: typeof link_url === "string" ? link_url.trim() || null : null,
      image_url: typeof image_url === "string" ? image_url.trim() || null : null,
      position: count ?? 0,
    })
    .select()
    .single();

  if (error || !option) {
    console.error("[options post] insert error:", error);
    return NextResponse.json({ error: "Failed to create option" }, { status: 500 });
  }

  return NextResponse.json(option);
}
