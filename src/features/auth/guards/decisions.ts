// The route-guard decisions (TP1-06), as pure functions so every guard is unit-tested directly against every
// status × role — no React, no Next, no DOM. The guard wrapper components and the middleware both apply these.
//
// These guards are a ROUTING/RENDERING layer, exactly like RequireMfa (ADR-0009): they decide which screen a
// session lands on. They are NOT the authorization boundary — the database (RLS) is, denying an administrator
// manager table regardless of how they reached the route (ADR-0005/0009/0011). So a role/status read that is
// missing or wrong is a cosmetic routing bug, never a data exposure. Role/status come from the verified
// access-token claims; MFA (aal) is handled by decideMfaGate, and terms is an inert slot until its screen
// lands (ADR-0011).

import type { AdminRole, AdminStatus } from "@/lib/roles";

export interface AuthSnapshot {
  readonly authenticated: boolean;
  readonly status: AdminStatus | null;
  readonly role: AdminRole | null;
}

// PublicOnly — a signed-in administrator should not sit on a public-only page (e.g. sign-in); send them in.
export type PublicOnlyAction = "allow" | "to-app";
export function decidePublicOnly(auth: Pick<AuthSnapshot, "authenticated">): PublicOnlyAction {
  return auth.authenticated ? "to-app" : "allow";
}

// RequireSession — must be signed in.
export type SessionAction = "allow" | "sign-in";
export function decideRequireSession(auth: Pick<AuthSnapshot, "authenticated">): SessionAction {
  return auth.authenticated ? "allow" : "sign-in";
}

// RequireActive — must be an active administrator. Not signed in → sign-in; deactivated → a blocked state;
// invited → onboarding (its flow is a later ticket); active or an unreadable status → allow (fail open, RLS
// still protects the data).
export type ActiveAction = "allow" | "sign-in" | "deactivated" | "onboarding";
export function decideRequireActive(auth: Pick<AuthSnapshot, "authenticated" | "status">): ActiveAction {
  if (!auth.authenticated) return "sign-in";
  if (auth.status === "deactivated") return "deactivated";
  if (auth.status === "invited") return "onboarding";
  return "allow";
}

// RequireRole — must hold the required role. Not signed in → sign-in; any other role, or an unreadable role
// → forbidden. Unknown role is denied (fail CLOSED for the UX of a privileged route): we never render a
// manager screen to a session whose role we cannot confirm. The data is protected by RLS either way, so on
// the rare transient read failure a real manager sees the forbidden screen rather than manager UI leaking.
export type RoleAction = "allow" | "sign-in" | "forbidden";
export function decideRequireRole(
  auth: Pick<AuthSnapshot, "authenticated" | "role">,
  required: AdminRole,
): RoleAction {
  if (!auth.authenticated) return "sign-in";
  return auth.role === required ? "allow" : "forbidden";
}

// RequireTerms — must have accepted the current policies. INERT for now (ADR-0011, option A): the
// terms-acceptance screen is a later ticket and the database (restrictive RLS, migration 009) already blocks
// the data until acceptance. Only an explicit false routes to the (future) terms screen; null/true allow.
export type TermsAction = "allow" | "terms";
export function decideRequireTerms(auth: { termsAccepted: boolean | null }): TermsAction {
  return auth.termsAccepted === false ? "terms" : "allow";
}
