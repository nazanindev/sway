import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { rateLimit, getIp } from "@/lib/rate-limit";

const ALLOWED_EMOJIS = new Set(["😍", "🤔", "🚩", "👍"]);

export async function POST(req: Request) {
  const ip = getIp(req);
  if (!rateLimit(`reactions:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { option_id, emoji, user_id } = body as Record<string, unknown>;

  if (typeof option_id !== "string" || typeof emoji !== "string" || typeof user_id !== "string") {
    return NextResponse.json({ error: "option_id, emoji, user_id required" }, { status: 400 });
  }
  if (!ALLOWED_EMOJIS.has(emoji)) {
    return NextResponse.json({ error: "emoji not allowed" }, { status: 400 });
  }
  // Soft-validate UUID format to prevent injection
  if (!/^[0-9a-f-]{36}$/.test(user_id)) {
    return NextResponse.json({ error: "invalid user_id" }, { status: 400 });
  }

  const db = getServiceClient();

  // Check option exists (also validates option_id is a real UUID)
  const { data: option } = await db.from("options").select("id").eq("id", option_id).single();
  if (!option) {
    return NextResponse.json({ error: "option not found" }, { status: 404 });
  }

  // Upsert: if same (option, user, emoji) exists, this is a toggle → delete
  const { data: existing } = await db
    .from("reactions")
    .select("id")
    .eq("option_id", option_id)
    .eq("user_id", user_id)
    .eq("emoji", emoji)
    .single();

  if (existing) {
    await db.from("reactions").delete().eq("id", existing.id);
    return NextResponse.json({ toggled: "removed" });
  }

  const { error } = await db.from("reactions").insert({ option_id, emoji, user_id });
  if (error) {
    return NextResponse.json({ error: "Failed to save reaction" }, { status: 500 });
  }

  return NextResponse.json({ toggled: "added" });
}
