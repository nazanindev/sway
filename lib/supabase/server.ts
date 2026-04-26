import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Server-only client with elevated privileges — never import in browser code
export function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
