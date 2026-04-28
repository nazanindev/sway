import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { rateLimit, getIp } from "@/lib/rate-limit";
import { isValidUrl } from "@/lib/validate-url";

const MAX_TITLE_LEN = 80;
const MAX_NOTES_LEN = 300;

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ip = getIp(req);
  if (!rateLimit(`options-patch:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { token, title, notes, link_url, image_url } = body as Record<string, unknown>;

  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
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

  const { data: option } = await db
    .from("options")
    .select("board_id")
    .eq("id", params.id)
    .single();

  if (!option) {
    return NextResponse.json({ error: "Option not found" }, { status: 404 });
  }

  const { data: board } = await db
    .from("boards")
    .select("edit_token")
    .eq("id", option.board_id)
    .single();

  if (!board || board.edit_token !== token) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  const { error } = await db
    .from("options")
    .update({
      title: title.trim(),
      notes: typeof notes === "string" ? notes.trim() || null : null,
      link_url: typeof link_url === "string" ? link_url.trim() || null : null,
      image_url: typeof image_url === "string" ? image_url.trim() || null : null,
    })
    .eq("id", params.id);

  if (error) {
    console.error("[options patch] update error:", error);
    return NextResponse.json({ error: "Failed to update option" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ip = getIp(req);
  if (!rateLimit(`options-delete:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { token } = body as Record<string, unknown>;
  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  const db = getServiceClient();

  const { data: option } = await db
    .from("options")
    .select("board_id")
    .eq("id", params.id)
    .single();

  if (!option) {
    return NextResponse.json({ error: "Option not found" }, { status: 404 });
  }

  const { data: board } = await db
    .from("boards")
    .select("edit_token")
    .eq("id", option.board_id)
    .single();

  if (!board || board.edit_token !== token) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  const { error } = await db.from("options").delete().eq("id", params.id);

  if (error) {
    console.error("[options delete] error:", error);
    return NextResponse.json({ error: "Failed to delete option" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
