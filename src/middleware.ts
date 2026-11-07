// Edge middleware for the admin app. It keeps the HttpOnly cookie session fresh (via updateSession — the
// only place a session is read/written, ADR-0005) and guards the app in two stages: an unauthenticated
// visitor to any non-public path is sent to sign-in, and a signed-in administrator who has not satisfied
// two-factor is sent to enrol or verify (RequireMfa, ADR-0009). The Supabase client is constructed in
// src/lib/supabase/server.ts, never here, so the "Exactly one Supabase client" arch-gate rule holds.
//
// RequireMfa is a ROUTING layer only: it decides which screen a session lands on. The authorization
// boundary is the RLS is_aal2() gate (migrations 001/005/009), which denies every aal1 request no matter
// how the user got there — so a routing miss here is a cosmetic bug, never a data exposure (ADR-0009).

import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { updateSession } from "@/lib/supabase/server";
import { decideMfaGate, normalisePath } from "@/features/auth/requireMfa";

export async function middleware(request: NextRequest) {
  // Without Supabase env (e.g. local dev before the secrets are set) there is no session to refresh or
  // guard, so pass through and keep the UI reachable. Production always has env, so the guard is active.
  if (!hasSupabaseEnv()) {
    return NextResponse.next();
  }

  const { response, user, aal } = await updateSession(request);
  const decision = decideMfaGate({
    path: normalisePath(request.nextUrl.pathname),
    authenticated: Boolean(user),
    currentLevel: aal?.currentLevel ?? null,
    nextLevel: aal?.nextLevel ?? null,
  });

  switch (decision.action) {
    case "sign-in": {
      const signInUrl = new URL("/admin/sign-in", request.url);
      signInUrl.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(signInUrl);
    }
    case "enrol":
      return NextResponse.redirect(new URL("/admin/mfa/enrol", request.url));
    case "verify":
      return NextResponse.redirect(new URL("/admin/sign-in/verify", request.url));
    default:
      return response;
  }
}

export const config = {
  // Run on every request except Next.js internals and static assets; those never carry a session to
  // refresh and must not pay the auth-server round-trip.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
