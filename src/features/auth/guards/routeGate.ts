// The middleware role route table (TP1-06), pure so it is unit-tested directly. src/middleware.ts owns the
// redirect; this owns only the rule: which paths are manager-only, and whether a session may enter one. It
// runs AFTER the sign-in and MFA gates, so by the time it fires the session is authenticated and (on a gated
// path) aal2. Like the other gates it is UX routing, never the boundary — the manager API returns 403 and
// RLS returns no rows to a non-manager regardless of this decision (ADR-0011).

import { matchesAny } from "@/features/auth/requireMfa";
import { MANAGER_ROLE, type AdminRole } from "@/lib/roles";

// Manager-only page paths (normalised, no /admin basePath). The manager API enforces itself in its handler
// (403) and is not listed here; this table drives the early PAGE redirect to the forbidden screen.
export const MANAGER_ONLY_PATHS = ["/admins"] as const;

export interface RoleGateInput {
  /** Request path, already normalised with normalisePath(). */
  readonly path: string;
  readonly authenticated: boolean;
  /** From the verified access-token claims; null when absent or unreadable. */
  readonly role: AdminRole | null;
}

export type RoleGateDecision = { readonly action: "allow" } | { readonly action: "forbidden" };

/**
 * Decide whether a request may enter a manager-only path. An unauthenticated request is left to the sign-in
 * guard. On a manager-only path, only an administrator manager is allowed; any other role, or an unreadable
 * role, is forbidden (fail closed for a privileged route — never render manager UI to an unconfirmed role).
 */
export function decideRoleGate(input: RoleGateInput): RoleGateDecision {
  if (!input.authenticated) return { action: "allow" };
  if (!matchesAny(input.path, MANAGER_ONLY_PATHS)) return { action: "allow" };
  return input.role === MANAGER_ROLE ? { action: "allow" } : { action: "forbidden" };
}

/** True iff this normalised path is manager-only (used by the nav to hide manager entries). */
export function isManagerOnlyPath(path: string): boolean {
  return matchesAny(path, MANAGER_ONLY_PATHS);
}
