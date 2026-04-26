import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { rateLimit, getIp } from "@/lib/rate-limit";

const MAX_BODY_LEN = 500;
const MAX_NAME_LEN = 50;

export async function POST(req: Request) {
  const ip = getIp(req);
  if (!rateLimit(`comments:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { option_id, body: commentBody, user_name } = body as Record<string, unknown>;

  if (typeof option_id !== "string") {
    return NextResponse.json({ error: "option_id required" }, { status: 400 });
  }
  if (typeof commentBody !== "string" || commentBody.trim().length === 0) {
    return NextResponse.json({ error: "body required" }, { status: 400 });
  }
  if (commentBody.trim().length > MAX_BODY_LEN) {
    return NextResponse.json({ error: "comment too long" }, { status: 400 });
  }
  if (typeof user_name === "string" && user_name.length > MAX_NAME_LEN) {
    return NextResponse.json({ error: "user_name too long" }, { status: 400 });
  }

  const db = getServiceClient();

  const { data: option } = await db.from("options").select("id").eq("id", option_id).single();
  if (!option) {
    return NextResponse.json({ error: "option not found" }, { status: 404 });
  }

  const { data, error } = await db
    .from("comments")
    .insert({
      option_id,
      body: commentBody.trim(),
      user_name: typeof user_name === "string" ? user_name.trim() || null : null,
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Failed to save comment" }, { status: 500 });
  }

  return NextResponse.json(data);
}
