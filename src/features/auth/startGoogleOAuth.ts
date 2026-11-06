// Begins the "Continue with Google" flow (ADR-0005). Runs on the server so the PKCE code-verifier is set
// as an HttpOnly cookie (the browser never holds it); Supabase returns the provider URL to redirect to.
// Google then returns to /admin/auth/callback, where completeOAuthCallback finishes the exchange and
// enforces that the Google email has an administrator profile.

import { createServerSupabase } from "@/lib/supabase/server";

export async function startGoogleOAuth(origin: string): Promise<string | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/admin/auth/callback` },
  });
  if (error || !data.url) return null;
  return data.url;
}
