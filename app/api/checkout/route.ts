import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServiceClient } from "@/lib/supabase/server";
import { rateLimit, getIp } from "@/lib/rate-limit";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });
const EXTENSION_PRICE_CENTS = 199; // $1.99

export async function POST(req: Request) {
  const ip = getIp(req);
  if (!rateLimit(`checkout:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { board_id } = body as Record<string, unknown>;
  if (typeof board_id !== "string") {
    return NextResponse.json({ error: "board_id required" }, { status: 400 });
  }

  const db = getServiceClient();
  const { data: board } = await db.from("boards").select("id, title").eq("id", board_id).single();
  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL;
  if (!base) {
    return NextResponse.json({ error: "NEXT_PUBLIC_BASE_URL is not configured" }, { status: 500 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: EXTENSION_PRICE_CENTS,
          product_data: { name: `Extend board: "${board.title}"` },
        },
        quantity: 1,
      },
    ],
    metadata: { board_id },
    success_url: `${base}/b/${board_id}?extended=1`,
    cancel_url: `${base}/b/${board_id}`,
  });

  // Record pending payment
  await db.from("payments").insert({
    board_id,
    stripe_session_id: session.id,
    amount_cents: EXTENSION_PRICE_CENTS,
    status: "pending",
  });

  return NextResponse.json({ url: session.url });
}
