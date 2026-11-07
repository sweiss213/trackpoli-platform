// The server-side Supabase clients (ADR-0005). These are the ONLY clients that read or set the session.
// Two request-bound contexts live here, both inside src/lib/supabase so the arch-gate "Exactly one
// Supabase client" rule holds:
//   - createServerSupabase(): for Server Components, Server Actions and Route Handlers (binds to the
//     next/headers cookie store).
//   - updateSession(): for middleware (binds to the NextRequest/NextResponse cookie jars).
// A fresh instance is created per request — never a module-level singleton — because each closes over
// request-scoped cookies. Session cookies are scoped to the /admin path (matching basePath), so they are
// never sent to another app on the domain, and they are HttpOnly, so no browser script can read the token.
//
// next/headers is imported lazily (only inside createServerSupabase) so that importing this module from
// edge middleware does not statically pull an RSC-only API into the middleware bundle.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { report } from "@/lib/report";
import { supabaseAnonKey, supabaseUrl } from "./config";

const COOKIE_OPTIONS = { path: "/admin" } as const;

/** A per-request client bound to the next/headers cookie store (Server Components / Actions / Routes). */
export async function createServerSupabase() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookieOptions: COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, {
              ...options,
              path: "/admin",
              httpOnly: true,
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            });
          }
        } catch (error) {
          // Expected when called from a Server Component, where the cookie store is read-only; the session
          // is refreshed instead by middleware on the next request. We recover by deferring the write to
          // middleware, and still report so a genuine cookie-write failure is never silently swallowed
          // (decisions.md, Error handling).
          report("debug", "server supabase setAll skipped (read-only cookie context)", {
            cookieCount: cookiesToSet.length,
            reason: error instanceof Error ? error.message : String(error),
          });
        }
      },
    },
  });
}

/** The caller's two-factor assurance level, used only for routing (ADR-0009). currentLevel is the session's
 *  present level; nextLevel is "aal2" once a verified factor exists. The RLS is_aal2() gate, not this, is
 *  the authorization boundary. */
export interface AssuranceLevel {
  // Supabase types these as a loose string ("aal1" | "aal2" | (string & {})); we compare against "aal2".
  currentLevel: string | null;
  nextLevel: string | null;
}

/**
 * Refresh the session for a middleware pass and return the current user alongside the response that
 * carries any refreshed cookies. The caller (src/middleware.ts) owns the routing/guard decision; this
 * function owns only the session read, the assurance-level read, and the cookie plumbing.
 */
export async function updateSession(
  request: NextRequest,
): Promise<{ response: NextResponse; user: User | null; aal: AssuranceLevel | null }> {
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookieOptions: COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value); // owasp-lint:ignore request-side mirror for this pass only, not a browser Set-Cookie; security attributes apply to the response set below, not to request cookies
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, {
            ...options,
            path: "/admin",
            httpOnly: true,
            sameSite: "lax",
            secure: request.nextUrl.protocol === "https:",
          });
        }
      },
    },
  });

  // getUser() revalidates the token with the auth server (unlike getSession, which trusts the cookie),
  // which is what refreshes an expiring session and lets middleware trust the result.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Assurance level drives only which MFA screen the user lands on (ADR-0009). Best-effort: if it cannot be
  // read, return null and let the route gate skip the MFA redirect — RLS still denies every aal1 request, so
  // a missing reading is a cosmetic routing gap, never a data exposure.
  let aal: AssuranceLevel | null = null;
  if (user) {
    try {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (data) aal = { currentLevel: data.currentLevel, nextLevel: data.nextLevel };
    } catch (error) {
      report("debug", "assurance-level read skipped", {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { response, user, aal };
}

/**
 * Exchange a Google re-authentication code to read ONLY the returning identity, without persisting the new
 * session (ADR-0009, device replacement). The cookie writes from the exchange are discarded, so the
 * administrator's live aal2 session is left untouched — we learn who came back from Google and compare, but
 * do not drop them to aal1. Returns whether the returning identity matches the current session's user.
 */
export async function exchangeReauthIdentity(
  code: string,
): Promise<{ status: "ok" | "mismatch" | "error"; userId: string | null }> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookieOptions: COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      // Discard every write: the re-auth session must NOT replace the live aal2 session (ADR-0009). The
      // PKCE verifier is read above; the resulting session is intentionally thrown away.
      setAll() {},
    },
  });

  const {
    data: { user: before },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user || !before) {
    return { status: "error", userId: before?.id ?? null };
  }
  return { status: data.user.id === before.id ? "ok" : "mismatch", userId: before.id };
}
