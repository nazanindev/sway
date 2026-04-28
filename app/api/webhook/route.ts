import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServiceClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });

// Next.js App Router: disable body parsing so we can verify the raw payload
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const boardId = session.metadata?.board_id;

    if (boardId && session.payment_status === "paid") {
      const db = getServiceClient();

      const DURATION_MS: Record<string, number> = {
        "7d":  7  * 24 * 60 * 60 * 1000,
        "30d": 30 * 24 * 60 * 60 * 1000,
        "60d": 60 * 24 * 60 * 60 * 1000,
      };
      const duration = session.metadata?.duration ?? "7d";
      const ms = DURATION_MS[duration] ?? DURATION_MS["7d"];

      await db
        .from("boards")
        .update({ expires_at: new Date(Date.now() + ms).toISOString() })
        .eq("id", boardId);

      await db
        .from("payments")
        .update({ status: "paid" })
        .eq("stripe_session_id", session.id);
    }
  }

  return NextResponse.json({ received: true });
}
