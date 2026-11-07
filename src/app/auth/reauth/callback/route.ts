// GET /admin/auth/reauth/callback — where Google returns for a device-replacement re-authentication
// (ADR-0009). It reads ONLY the returning identity (the session from the exchange is discarded, so the
// administrator's live aal2 session is untouched) and, when it matches the current user, sets a short-lived
// HMAC-signed marker the replace-authorize route will trust. Then it returns to the Security tab with the
// outcome so the modal can resume:
//   reauth=ok       -> re-authenticated, enter the current code
//   reauth=mismatch -> a different Google account signed in
//   reauth=error    -> sign-in not completed
//
// Honest limit: the Google OAuth round-trip cannot be exercised end-to-end until the Google account and
// domain exist (Q-1-21, E2E-16, domain-blocked), the same deferral as the sign-in Google path. The marker
// signing/verification and the identity-match logic are unit-tested; the live round-trip is verified then.

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { exchangeReauthIdentity } from "@/lib/supabase/server";
import { REAUTH_MARKER_COOKIE, REAUTH_MARKER_TTL_MS, signReauthMarker } from "@/lib/reauthMarker";

export async function GET(request: NextRequest) {
  const back = new URL("/admin/settings/security", request.url);
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    back.searchParams.set("reauth", "error");
    return NextResponse.redirect(back);
  }

  const { status, userId } = await exchangeReauthIdentity(code);
  back.searchParams.set("reauth", status);

  if (status === "ok" && userId) {
    const cookieStore = await cookies();
    cookieStore.set(REAUTH_MARKER_COOKIE, signReauthMarker(userId), {
      path: "/admin",
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      maxAge: Math.floor(REAUTH_MARKER_TTL_MS / 1000),
    });
  }

  return NextResponse.redirect(back);
}
