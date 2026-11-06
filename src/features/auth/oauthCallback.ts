// Completes the "Continue with Google" handshake (ADR-0005). Supabase redirects back with a one-time
// code; we exchange it for a session (which sets the HttpOnly cookies) and then require that the signed-in
// Google email actually has an administrator profile. If it does not, we sign straight back out — sign-up
// is disabled, so no account is created, and the user is returned to the same generic failure as a bad
// password. Access is still decided from `profiles`, never from the OAuth identity alone.

import { createServerSupabase } from "@/lib/supabase/server";

export async function completeOAuthCallback(code: string): Promise<{ ok: boolean }> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return { ok: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return { ok: false };
  }

  return { ok: true };
}
