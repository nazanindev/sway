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

  if (!ready) return null;

  return (
    <nav className="flex items-center justify-end gap-4 px-4 py-3 max-w-lg mx-auto">
      {user ? (
        <a href="/dashboard" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">
          My boards
        </a>
      ) : (
        <a href="/auth/login" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">
          Sign in
        </a>
      )}
    </nav>
  );
}
