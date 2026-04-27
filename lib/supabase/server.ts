import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Server-only client with elevated privileges — never import in browser code.
// The global fetch override ensures Next.js never caches Supabase responses,
// so page loads always reflect the current DB state.
export function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      global: {
        fetch: (url: RequestInfo | URL, options: RequestInit = {}) =>
          fetch(url, { ...options, cache: "no-store" }),
      },
    }
  );
}
