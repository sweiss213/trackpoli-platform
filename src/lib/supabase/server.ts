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

/**
 * Refresh the session for a middleware pass and return the current user alongside the response that
 * carries any refreshed cookies. The caller (src/middleware.ts) owns the routing/guard decision; this
 * function owns only the session read and the cookie plumbing.
 */
export async function updateSession(
  request: NextRequest,
): Promise<{ response: NextResponse; user: User | null }> {
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
  return { response, user };
}
