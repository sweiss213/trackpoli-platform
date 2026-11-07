// The RequireMfa gate decision (ADR-0009), as a pure function so it is unit-tested directly — no Next, DOM,
// or Supabase imports. src/middleware.ts owns the session refresh, the assurance-level read, and turning a
// decision into a NextResponse; this owns only the routing rule.
//
// RequireMfa is a ROUTING layer, never the authorization boundary: the RLS is_aal2() gate denies every aal1
// request regardless of routing, so a miss here is cosmetic, not a data exposure (ADR-0009).

// Paths reachable without a session: the sign-in screen, the OAuth routes, and the sign-in API.
export const MFA_PUBLIC_PATHS = ["/sign-in", "/auth/callback", "/auth/google", "/api/sign-in"] as const;

// Paths a signed-in administrator may reach while still at aal1, so the two-factor funnel cannot deadlock:
// the enrol and verify screens, their APIs, and sign-out (so a stuck user can always leave). Everything
// else requires aal2 to resolve.
export const MFA_EXEMPT_PATHS = [
  "/mfa/enrol",
  "/sign-in/verify",
  "/api/mfa/enrol",
  "/api/mfa/verify",
  "/api/sign-out",
] as const;

/** Normalise away the /admin basePath whether or not the runtime includes it in the pathname. */
export function normalisePath(pathname: string): string {
  if (pathname.startsWith("/admin")) return pathname.slice("/admin".length) || "/";
  return pathname;
}

export function matchesAny(path: string, list: readonly string[]): boolean {
  return list.some((p) => path === p || path.startsWith(`${p}/`));
}

export interface MfaGateInput {
  /** The request path, already normalised with normalisePath(). */
  path: string;
  authenticated: boolean;
  /** Assurance level from updateSession; null when it could not be read (then MFA routing is skipped). */
  currentLevel: string | null;
  nextLevel: string | null;
}

export type MfaGateDecision =
  | { action: "allow" }
  | { action: "sign-in" } // not authenticated on a protected path
  | { action: "enrol" } // authenticated, below aal2, no verified factor yet
  | { action: "verify" }; // authenticated, below aal2, a verified factor exists

/**
 * Decide where a request should go. Order matches middleware: the sign-in guard first, then RequireMfa.
 * A missing assurance reading (currentLevel null) leaves routing to "allow" — RLS still protects the data.
 */
export function decideMfaGate(input: MfaGateInput): MfaGateDecision {
  const onPublic = matchesAny(input.path, MFA_PUBLIC_PATHS);

  if (!input.authenticated) {
    return onPublic ? { action: "allow" } : { action: "sign-in" };
  }

  // Authenticated. Apply RequireMfa only on a confident sub-aal2 reading and only on a gated path.
  const belowAal2 = input.currentLevel !== null && input.currentLevel !== "aal2";
  if (belowAal2 && !onPublic && !matchesAny(input.path, MFA_EXEMPT_PATHS)) {
    return input.nextLevel === "aal2" ? { action: "verify" } : { action: "enrol" };
  }

  return { action: "allow" };
}
