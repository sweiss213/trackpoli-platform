// A throwaway, non-persistent Supabase client used ONLY to verify a password without disturbing the live
// session (ADR-0009, device replacement). It lives in src/lib/supabase so the "exactly one client per
// context" rule holds — this is its own context (verification), like admin.ts is the service-role context.
//
// Device replacement re-authenticates an email administrator by their current password (OWASP MFA
// "Changing MFA factors" — the open session alone is not trusted). We must check the password without
// re-issuing the user's session (which would drop them from aal2), so we use a client with
// persistSession:false whose in-memory session we discard. No cookies are written.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { report } from "@/lib/report";
import { supabaseAnonKey, supabaseUrl } from "./config";

function createVerifierSupabase() {
  if (typeof window !== "undefined") {
    throw new Error("verifier.ts must never run in the browser.");
  }
  return createClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** True iff email+password authenticate. The resulting session is never persisted, so the caller's live
 *  (aal2) session is untouched. A transport error is reported and treated as not-verified (fail closed). */
export async function verifyPassword(email: string, password: string): Promise<boolean> {
  try {
    const supabase = createVerifierSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return !error && Boolean(data.user);
  } catch (error) {
    report("warning", "password verification failed to run", {
      reason: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
