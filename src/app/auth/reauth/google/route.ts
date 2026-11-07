// GET /admin/auth/reauth/google — starts the Google re-authentication for device replacement (ADR-0009).
// Reached only by an already signed-in (aal2) administrator from the Security tab. Thin: start the OAuth
// round-trip and redirect to Google; on failure, return to Security settings with the error marker so the
// replacement modal can show "Google sign-in not completed".

import { NextResponse, type NextRequest } from "next/server";
import { startGoogleReauth } from "@/features/auth/startGoogleReauth";

export async function GET(request: NextRequest) {
  const url = await startGoogleReauth(request.nextUrl.origin);
  if (!url) {
    const back = new URL("/admin/settings/security", request.url);
    back.searchParams.set("reauth", "error");
    return NextResponse.redirect(back);
  }
  return NextResponse.redirect(url);
}
