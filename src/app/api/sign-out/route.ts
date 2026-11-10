// POST /admin/api/sign-out — ends THIS session only. Reachable at aal1 (the MFA funnel is exempt from
// RequireMfa) so an administrator stuck on the forced enrol/verify gate can always leave (ADR-0009). Thin:
// destroy this session with Supabase scope "local" — signing out on one device must not revoke the others
// (TP1-05; "sign out other sessions" is the separate, explicit action) — clear the signed activity cookie,
// and send Clear-Site-Data so the browser drops its cookie copies (OWASP Session Management). The server
// actively destroys the session, not just the cookie; a failure is reported but still answered ok — the
// client leaves either way.

import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { report } from "@/lib/report";
import { ACTIVITY_COOKIE } from "@/lib/sessionActivity";

export async function POST() {
  try {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut({ scope: "local" });
  } catch (error) {
    report("warning", "sign-out failed", {
      reason: error instanceof Error ? error.message : String(error),
    });
  }

  const response = NextResponse.json({ ok: true });
  // Drop the activity cookie and tell the browser to clear its cookie copies for this origin.
  response.cookies.set(ACTIVITY_COOKIE, "", { path: "/admin", maxAge: 0 }); // owasp-lint:ignore deletion (maxAge:0, empty value); cookie security flags do not apply to a clear
  response.headers.set("Clear-Site-Data", '"cookies"');
  return response;
}
