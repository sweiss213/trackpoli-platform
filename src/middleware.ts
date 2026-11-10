// Edge middleware for the admin app. It keeps the HttpOnly cookie session fresh (via updateSession — the
// only place a session is read/written, ADR-0005) and guards the app in three stages: an expired session
// (idle or 4-hour absolute limit, TP1-05) is sent to /session-expired; an unauthenticated visitor to any
// non-public path is sent to sign-in; and a signed-in administrator who has not satisfied two-factor is sent
// to enrol or verify (RequireMfa, ADR-0009). The Supabase client is constructed in src/lib/supabase/server.ts,
// never here, so the "Exactly one Supabase client" arch-gate rule holds.
//
// Both gates are ROUTING layers only. The authorization boundary is the RLS is_aal2() gate (migrations
// 001/005/009), which denies every aal1 request regardless of routing, and the session timeout is enforced
// by the signed activity cookie read below; a routing miss here is cosmetic, never a data exposure (ADR-0009).
// Session enforcement FAILS OPEN: an unreadable or absent activity cookie (or a missing secret in local dev)
// leaves routing to the MFA/sign-in stages, so a reading gap never locks an administrator out.

import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv, internalCallSecret } from "@/lib/supabase/config";
import { updateSession } from "@/lib/supabase/server";
import { decideMfaGate, normalisePath } from "@/features/auth/requireMfa";
import { decideSessionGate } from "@/features/auth/session/sessionGate";
import { ACTIVITY_COOKIE, evaluateActivity, readActivity } from "@/lib/sessionActivity";
import { sessionLimits } from "@/lib/config";
import { report } from "@/lib/report";

/** Expire the session's cookies on a response so the browser stops presenting a dead session. */
function clearAuthCookies(request: NextRequest, response: NextResponse): void {
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-") || cookie.name === ACTIVITY_COOKIE) {
      response.cookies.set(cookie.name, "", { path: "/admin", maxAge: 0 }); // owasp-lint:ignore deletion (maxAge:0, empty value); cookie security flags do not apply to a clear
    }
  }
}

export async function middleware(request: NextRequest) {
  // Without Supabase env (e.g. local dev before the secrets are set) there is no session to refresh or
  // guard, so pass through and keep the UI reachable. Production always has env, so the guard is active.
  if (!hasSupabaseEnv()) {
    return NextResponse.next();
  }

  const { response, user, aal } = await updateSession(request);
  const path = normalisePath(request.nextUrl.pathname);

  // Stage 1: session-timeout enforcement (TP1-05). Best-effort: if the cookie or secret cannot be read, the
  // state is null and the gate allows — RLS still protects the data.
  let activityState = null;
  if (user) {
    try {
      const payload = await readActivity(request.cookies.get(ACTIVITY_COOKIE)?.value, internalCallSecret());
      if (payload) activityState = evaluateActivity(payload, Date.now(), sessionLimits());
    } catch (error) {
      report("debug", "session-timeout enforcement skipped", {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const sessionDecision = decideSessionGate({ path, authenticated: Boolean(user), activityState });
  if (sessionDecision.action === "expired") {
    // An API caller gets a clean 401 (the client's 401/403 seam lands it on /session-expired); a page
    // navigation is redirected, keeping the return path and the cause for the right copy.
    if (path.startsWith("/api/")) {
      const denied = NextResponse.json({ ok: false, reason: "expired" }, { status: 401 });
      clearAuthCookies(request, denied);
      return denied;
    }
    const expiredUrl = new URL("/admin/session-expired", request.url);
    expiredUrl.searchParams.set("reason", sessionDecision.cause);
    expiredUrl.searchParams.set("next", request.nextUrl.pathname);
    const redirect = NextResponse.redirect(expiredUrl);
    clearAuthCookies(request, redirect);
    return redirect;
  }

  // Stage 2 + 3: sign-in guard, then RequireMfa.
  const decision = decideMfaGate({
    path,
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
