// GET /admin/auth/callback — where Google returns after sign-in. Thin: take the one-time code, delegate
// the exchange + admin-profile check to the feature, and redirect. Success goes into the app; any failure
// (no code, bad exchange, or no administrator profile) goes back to the sign-in screen with the one
// generic error, revealing nothing about why. The screen reads ?error=auth to show the generic message.

import { NextResponse, type NextRequest } from "next/server";
import { completeOAuthCallback } from "@/features/auth/oauthCallback";

export async function GET(request: NextRequest) {
  const signInUrl = new URL("/admin/sign-in", request.url);
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    signInUrl.searchParams.set("error", "auth");
    return NextResponse.redirect(signInUrl);
  }

  const { ok } = await completeOAuthCallback(code);
  if (!ok) {
    signInUrl.searchParams.set("error", "auth");
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.redirect(new URL("/admin", request.url));
}
