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
        <h1 className="text-xl font-bold mb-2">Check your email</h1>
        <p className="text-[var(--muted)]">We sent a magic link to <strong>{email}</strong></p>
        <p className="text-sm text-[var(--muted)] mt-2">You can close this tab.</p>
      </main>
    );
  }

  return (
    <main className="max-w-sm mx-auto px-4 py-16">
      <a href="/" className="text-sm text-[var(--muted)] hover:underline">← Sway</a>
      <h1 className="text-2xl font-bold mt-4 mb-1">Sign in</h1>
      <p className="text-[var(--muted)] text-sm mb-8">We&apos;ll email you a magic link — no password needed.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          autoFocus
          className="w-full rounded-xl border border-[var(--border)] px-4 py-3 text-base outline-none focus:ring-2 focus:ring-[var(--accent)] bg-white"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="w-full rounded-xl bg-[var(--accent)] text-white font-semibold py-3 text-base hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {loading ? "Sending…" : "Send magic link →"}
        </button>
      </form>
    </main>
  );
}
