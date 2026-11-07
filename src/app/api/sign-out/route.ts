// POST /admin/api/sign-out — ends the current session. Reachable at aal1 (the MFA funnel is exempt from
// RequireMfa) so an administrator stuck on the forced enrol/verify gate can always leave (ADR-0009). Thin:
// clear the Supabase session (which clears the HttpOnly cookies) and return ok; the client then navigates
// to the sign-in screen. A sign-out failure is reported but still answered ok — the client leaves either way.

import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { report } from "@/lib/report";

export async function POST() {
  try {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  } catch (error) {
    report("warning", "sign-out failed", {
      reason: error instanceof Error ? error.message : String(error),
    });
  }
  return NextResponse.json({ ok: true });
}
