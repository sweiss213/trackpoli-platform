// The session-expiry routing decision (TP1-05), pure so it is unit-tested directly — no Next, no crypto.
// src/middleware.ts owns the session refresh, the signed-cookie read (sessionActivity.ts), and turning a
// decision into a redirect; this owns only the rule. It runs BEFORE the RequireMfa gate: an expired session
// is sent to /session-expired no matter its assurance level.
//
// Fail-open by design: a null activity state (cookie absent or unreadable) allows the request. The signed
// cookie is a UX + defense-in-depth timeout, and the RLS aal2 gate is the real authorization boundary, so a
// missing reading must never lock an administrator out — it just means "no timeout opinion this request".

import { matchesAny, MFA_PUBLIC_PATHS } from "@/features/auth/requireMfa";
import type { ActivityState } from "@/lib/sessionActivity";

// Paths the idle/absolute check must not fire on: the expired screen itself, and the session-management
// endpoints (the activity ping reports its own expiry with a 401; the sign-out routes must stay reachable).
export const SESSION_MANAGEMENT_PATHS = [
  "/session-expired",
  "/api/session/activity",
  "/api/sign-out",
  "/api/session/sign-out-others",
] as const;

export interface SessionGateInput {
  /** Request path, already normalised with normalisePath(). */
  readonly path: string;
  readonly authenticated: boolean;
  /** From the signed activity cookie; null when it was absent or could not be read. */
  readonly activityState: ActivityState | null;
}

export type SessionGateDecision =
  | { readonly action: "allow" }
  | { readonly action: "expired"; readonly cause: "idle" | "absolute" };

export function decideSessionGate(input: SessionGateInput): SessionGateDecision {
  if (!input.authenticated) return { action: "allow" };
  if (input.activityState === null || input.activityState === "active") return { action: "allow" };
  if (matchesAny(input.path, MFA_PUBLIC_PATHS) || matchesAny(input.path, SESSION_MANAGEMENT_PATHS)) {
    return { action: "allow" };
  }
  return { action: "expired", cause: input.activityState === "absolute-expired" ? "absolute" : "idle" };
}
