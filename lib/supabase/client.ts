import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Browser-safe client (anon key only)
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
