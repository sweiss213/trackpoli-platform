// Begins the Google re-authentication round-trip for device replacement (ADR-0009). Mirrors
// startGoogleOAuth, but returns to the dedicated re-auth callback (/admin/auth/reauth/callback), which reads
// ONLY the returning identity and does not persist a new session — so a Google-only administrator can prove
// it is still them without being dropped from aal2. The PKCE code-verifier is set as an HttpOnly cookie by
// the server client; the browser never holds it.

import { createServerSupabase } from "@/lib/supabase/server";

export async function startGoogleReauth(origin: string): Promise<string | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/admin/auth/reauth/callback` },
  });
  if (error || !data.url) return null;
  return data.url;
}
