"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function NavBar() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-[var(--border)]">
      <div className="flex items-center justify-between gap-4 px-4 py-3 max-w-lg mx-auto">
        <a href="/" className="font-bold text-[var(--text)] tracking-tight text-lg leading-none">
          Sway
        </a>
        {ready && (
          user ? (
            <a
              href="/dashboard"
              className="text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors duration-150 px-3 py-1.5 rounded-lg hover:bg-zinc-100"
            >
              My boards
            </a>
          ) : (
            <a
              href="/auth/login"
              className="text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors duration-150 px-3 py-1.5 rounded-lg hover:bg-zinc-100"
            >
              Sign in
            </a>
          )
        )}
      </div>
    </nav>
  );
}
