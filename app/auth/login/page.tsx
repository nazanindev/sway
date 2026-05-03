"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  if (sent) {
    return (
      <main className="max-w-sm mx-auto px-4 py-20 text-center">
        <div className="rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow-md)] px-8 py-10">
          <div className="w-10 h-10 rounded-full bg-[var(--accent-light)] flex items-center justify-center mx-auto mb-4">
            <svg className="w-5 h-5 text-[var(--accent)]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-2 tracking-tight">Check your email</h1>
          <p className="text-[var(--muted)] text-sm">We sent a magic link to <strong className="text-[var(--text)]">{email}</strong></p>
          <p className="text-sm text-[var(--muted)] mt-2">You can close this tab.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-sm mx-auto px-4 py-16">
      <div className="rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow-md)] px-8 py-10">
        <a href="/" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">← Sway</a>
        <h1 className="text-2xl font-bold mt-4 mb-1 tracking-tight">Sign in</h1>
        <p className="text-[var(--muted)] text-sm mb-8">We&apos;ll email you a magic link — no password needed.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1.5">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoFocus
              className="w-full rounded-xl border border-[var(--border)] px-4 py-3 text-base outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] bg-white shadow-[var(--shadow-sm)] transition-shadow"
            />
          </div>
          {error && <p className="text-red-500 text-sm" role="alert">{error}</p>}
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold py-3 text-base shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] disabled:opacity-40 transition-all duration-150 cursor-pointer"
          >
            {loading ? "Sending…" : "Send magic link →"}
          </button>
        </form>
      </div>
    </main>
  );
}
