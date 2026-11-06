// Edge middleware for the admin app. It keeps the HttpOnly cookie session fresh (via updateSession — the
// only place a session is read/written, ADR-0005) and guards the app: an unauthenticated visitor to any
// non-public path is redirected to the sign-in screen. The Supabase client is constructed in
// src/lib/supabase/server.ts, never here, so the "Exactly one Supabase client" arch-gate rule holds.

import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { updateSession } from "@/lib/supabase/server";

// Paths reachable without a session: the sign-in screen, the OAuth routes, and the sign-in API.
const PUBLIC_PATHS = ["/sign-in", "/auth/callback", "/auth/google", "/api/sign-in"];

function isPublic(pathname: string): boolean {
  // Normalise away the /admin basePath whether or not the runtime includes it in the pathname.
  let path = pathname;
  if (path.startsWith("/admin")) path = path.slice("/admin".length) || "/";
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  // Without Supabase env (e.g. local dev before the secrets are set) there is no session to refresh or
  // guard, so pass through and keep the UI reachable. Production always has env, so the guard is active.
  if (!hasSupabaseEnv()) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);
  if (!user && !isPublic(request.nextUrl.pathname)) {
    const signInUrl = new URL("/admin/sign-in", request.url);
    signInUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }
  return response;
}

export const config = {
  // Run on every request except Next.js internals and static assets; those never carry a session to
  // refresh and must not pay the auth-server round-trip.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
