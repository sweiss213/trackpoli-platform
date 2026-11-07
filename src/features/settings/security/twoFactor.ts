// Security-settings data for the Two-factor card (ADR-0009). The page renders; this owns the read, so no
// Supabase access lives in the component (decisions.md: UI -> data/service, never UI -> backend).
//
// It reports whether the administrator has a verified factor, their account type (password vs Google-only,
// which decides how device replacement re-authenticates), and whether they are an Admin manager (which
// decides the lost-device recovery copy). None of these is an access decision — access is the RLS aal2 gate.

import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createServerSupabase } from "@/lib/supabase/server";

export interface TwoFactorStatus {
  enrolled: boolean;
  accountType: "password" | "google";
  isManager: boolean;
}

export async function getTwoFactorStatus(): Promise<TwoFactorStatus> {
  if (!hasSupabaseEnv()) return { enrolled: false, accountType: "password", isManager: false };
  const supabase = await createServerSupabase();
  const [{ data: factors }, { data: userData }] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.auth.getUser(),
  ]);
  const user = userData.user;
  // A password account has an "email" identity; a Google-only account does not (it has only "google").
  const accountType = user?.identities?.some((identity) => identity.provider === "email")
    ? "password"
    : "google";

  let isManager = false;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    isManager = profile?.role === "admin_manager";
  }

  return {
    enrolled: Boolean(factors?.totp.some((factor) => factor.status === "verified")),
    accountType,
    isManager,
  };
}
