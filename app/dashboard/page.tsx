import { getAuthServerClient } from "@/lib/supabase/auth-server";
import { getServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SignOutButton from "./SignOutButton";
import DeleteButton from "./DeleteButton";

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
          <a href="/" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">← Sway</a>
          <h1 className="text-2xl font-bold mt-2 tracking-tight">My boards</h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/"
            className="text-sm px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-150"
          >
            New board
          </a>
          <SignOutButton />
        </div>
      </div>

      {!boards || boards.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow-sm)] p-10 text-center">
          <p className="font-semibold mb-1">No boards yet</p>
          <p className="text-sm text-[var(--muted)]">Create your first Sway to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {boards.map((board) => {
            const { label, closed } = boardStatus(board.expires_at);
            return (
              <div
                key={board.id}
                className="rounded-2xl border border-[var(--border)] bg-white px-5 py-4 flex items-center justify-between gap-4 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-150"
              >
                <div className="min-w-0">
                  <p className="font-semibold leading-snug truncate">{board.title}</p>
                  <div className="mt-1">
                    {closed ? (
                      <span className="inline-flex items-center text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                        Closed
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {label}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`${base}/b/${board.id}`}
                    className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white hover:border-[var(--accent)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)] font-medium transition-all duration-150"
                  >
                    View
                  </a>
                  {!closed && (
                    <a
                      href={`${base}/edit/${board.id}?token=${board.edit_token}`}
                      className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white hover:border-[var(--accent)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)] font-medium transition-all duration-150"
                    >
                      Edit
                    </a>
                  )}
                  <DeleteButton boardId={board.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
