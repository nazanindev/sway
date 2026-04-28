import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { getAuthServerClient } from "@/lib/supabase/auth-server";
import { isValidUrl } from "@/lib/validate-url";
import { rateLimit, getIp } from "@/lib/rate-limit";

const MAX_OPTIONS = 6;
const MAX_TITLE_LEN = 120;
const MAX_NOTES_LEN = 300;
const MAX_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const EXPIRY_MAP: Record<string, number> = {
  "1h":  1 * 60 * 60 * 1000,
  "6h":  6 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "3d":  3 * 24 * 60 * 60 * 1000,
  "7d":  7 * 24 * 60 * 60 * 1000,
};

export async function POST(req: Request) {
  const ip = getIp(req);
  if (!rateLimit(`boards:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, description, options, expires_in } = body as Record<string, unknown>;

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (title.trim().length > MAX_TITLE_LEN) {
    return NextResponse.json({ error: "title too long" }, { status: 400 });
  }
  if (!Array.isArray(options) || options.length < 1 || options.length > MAX_OPTIONS) {
    return NextResponse.json(
      { error: `options must be an array of 1–${MAX_OPTIONS} items` },
      { status: 400 }
    );
  }

  const expiryMs = typeof expires_in === "string" && EXPIRY_MAP[expires_in]
    ? EXPIRY_MAP[expires_in]
    : MAX_EXPIRY_MS;
  const expiresAt = new Date(Date.now() + Math.min(expiryMs, MAX_EXPIRY_MS));

  for (const opt of options) {
    if (typeof opt !== "object" || opt === null) {
      return NextResponse.json({ error: "each option must be an object" }, { status: 400 });
    }
    const o = opt as Record<string, unknown>;
    if (typeof o.title !== "string" || o.title.trim().length === 0) {
      return NextResponse.json({ error: "each option needs a title" }, { status: 400 });
    }
    if (!isValidUrl(o.image_url as string)) {
      return NextResponse.json({ error: "invalid image_url" }, { status: 400 });
    }
    if (!isValidUrl(o.link_url as string)) {
      return NextResponse.json({ error: "invalid link_url" }, { status: 400 });
    }
    if (typeof o.notes === "string" && o.notes.length > MAX_NOTES_LEN) {
      return NextResponse.json({ error: "notes too long" }, { status: 400 });
    }
  }

  const db = getServiceClient();

  const authClient = getAuthServerClient();
  const { data: { user } } = await authClient.auth.getUser();

  const { data: board, error: boardErr } = await db
    .from("boards")
    .insert({
      title: title.trim(),
      description: typeof description === "string" ? description.trim() || null : null,
      expires_at: expiresAt.toISOString(),
      creator_id: user?.id ?? null,
    })
    .select()
    .single();

  if (boardErr || !board) {
    console.error("[boards] insert error:", boardErr);
    return NextResponse.json({ error: "Failed to create board" }, { status: 500 });
  }

  const optionRows = (options as Record<string, unknown>[]).map((o, i) => ({
    board_id: board.id,
    title: (o.title as string).trim(),
    image_url: (o.image_url as string | null) || null,
    link_url: (o.link_url as string | null) || null,
    notes: (o.notes as string | null) || null,
    position: i,
  }));

  const { error: optErr } = await db.from("options").insert(optionRows);
  if (optErr) {
    console.error("[boards] options insert error:", optErr);
    return NextResponse.json({ error: "Failed to create options" }, { status: 500 });
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  return NextResponse.json({
    boardId: board.id,
    publicUrl: `${base}/b/${board.id}`,
    editUrl: `${base}/edit/${board.id}?token=${board.edit_token}`,
  });
}
