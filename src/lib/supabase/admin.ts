// The service-role Supabase client (ADR-0005): server-only, bypasses RLS. Used only by server routes that
// must perform an audited privileged operation that the user's own RLS-scoped session cannot. It is NEVER
// imported from a client component — doing so would ship the service-role key into the browser bundle. The
// runtime guard below fails loudly if that ever happens, as a backstop to the src/lib/supabase-only import
// rule and the owasp lint.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { supabaseServiceRoleKey, supabaseUrl } from "./config";

export function createAdminSupabase() {
  if (typeof window !== "undefined") {
    throw new Error("admin.ts (service-role client) must never run in the browser.");
  }
  return createClient<Database>(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
