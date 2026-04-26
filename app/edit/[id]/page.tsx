import { getServiceClient } from "@/lib/supabase/server";
import EditClient from "./EditClient";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { token?: string };
}) {
  const db = getServiceClient();

  const { data: board } = await db
    .from("boards")
    .select("id, title, description, edit_token, expires_at")
    .eq("id", params.id)
    .single();

  if (!board) notFound();

  // Constant-time-ish comparison: reject on mismatch
  if (!searchParams.token || searchParams.token !== board.edit_token) {
    return (
      <main className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-red-500 font-medium">Invalid or missing edit token.</p>
      </main>
    );
  }

  const { data: options } = await db
    .from("options")
    .select("*")
    .eq("board_id", params.id)
    .order("position");

  return <EditClient board={board} initialOptions={options ?? []} />;
}
