// The admin role/status vocabulary (TP1-06), pure and client-safe (no server/DB/framework imports) so every
// layer can share it: the server session read, the edge middleware, and the client guards. These mirror the Postgres enums admin_role / admin_status (migration 001) and
// the app_role / app_status token claims the access-token hook injects (migration 006). They are used for
// ROUTING and RENDERING only — never authorization. The database (RLS) is the only thing that protects data
// (ADR-0005/0009); a role read here that is wrong or missing is a cosmetic routing bug, never an exposure.

export type AdminRole = "admin" | "admin_manager";
export type AdminStatus = "invited" | "active" | "deactivated";

/** The role that may reach manager-only routes and data. */
export const MANAGER_ROLE: AdminRole = "admin_manager";

/** Narrow an untrusted claim value to a known role, or null (the hook emits 'none' for a user with no profile). */
export function normaliseRole(value: unknown): AdminRole | null {
  return value === "admin" || value === "admin_manager" ? value : null;
}

/** Narrow an untrusted claim value to a known status, or null. */
export function normaliseStatus(value: unknown): AdminStatus | null {
  return value === "invited" || value === "active" || value === "deactivated" ? value : null;
}

/** Human-readable role label for UI copy (e.g. the forbidden page). */
export function roleLabel(role: AdminRole | null): string {
  if (role === "admin_manager") return "Administrator manager";
  if (role === "admin") return "Administrator";
  return "account";
}
