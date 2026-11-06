// GET /admin/auth/google — starts the Google sign-in flow and redirects to the provider. On any failure it
// returns to the sign-in screen with the generic error marker. Thin: the OAuth initiation lives in the
// feature module.

import { NextResponse, type NextRequest } from "next/server";
import { startGoogleOAuth } from "@/features/auth/startGoogleOAuth";

export async function GET(request: NextRequest) {
  const url = await startGoogleOAuth(request.nextUrl.origin);
  if (!url) {
    const signInUrl = new URL("/admin/sign-in", request.url);
    signInUrl.searchParams.set("error", "auth");
    return NextResponse.redirect(signInUrl);
  }
  return NextResponse.redirect(url);
}
