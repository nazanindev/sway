import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

// Browser-safe client (anon key only). Cookie-aware for auth session.
export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
