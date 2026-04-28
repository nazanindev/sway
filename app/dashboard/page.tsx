import { getAuthServerClient } from "@/lib/supabase/auth-server";
import { getServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SignOutButton from "./SignOutButton";

export const dynamic = "force-dynamic";

function boardStatus(expiresAt: string): { label: string; closed: boolean } {
  const closed = new Date(expiresAt) < new Date();
  return closed
    ? { label: "Closed", closed: true }
    : { label: formatExpiry(expiresAt), closed: false };
}

function formatExpiry(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "Closes soon";
  if (hours < 24) return `Closes in ${hours}h`;
  const days = Math.ceil(ms / 86_400_000);
  return `${days}d left`;
}

export default async function DashboardPage() {
  const auth = getAuthServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/auth/login");

  const db = getServiceClient();
  const { data: boards } = await db
    .from("boards")
    .select("id, title, expires_at, created_at, edit_token")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <a href="/" className="text-sm text-[var(--muted)] hover:underline">← Sway</a>
          <h1 className="text-2xl font-bold mt-2">My boards</h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">{user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="text-sm px-4 py-2 rounded-xl bg-[var(--accent)] text-white font-medium hover:opacity-90 transition-opacity"
          >
            New board
          </a>
          <SignOutButton />
        </div>
      </div>

      {!boards || boards.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[var(--border)] p-10 text-center">
          <p className="font-medium mb-1">No boards yet</p>
          <p className="text-sm text-[var(--muted)]">Create your first Sway to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {boards.map((board) => {
            const { label, closed } = boardStatus(board.expires_at);
            return (
              <div
                key={board.id}
                className="rounded-2xl border border-[var(--border)] bg-white px-5 py-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-medium leading-snug truncate">{board.title}</p>
                  <p className={`text-xs mt-0.5 ${closed ? "text-red-400" : "text-[var(--muted)]"}`}>
                    {label}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`${base}/b/${board.id}`}
                    className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-gray-50 transition-colors"
                  >
                    View
                  </a>
                  {!closed && (
                    <a
                      href={`${base}/edit/${board.id}?token=${board.edit_token}`}
                      className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-gray-50 transition-colors"
                    >
                      Edit
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
