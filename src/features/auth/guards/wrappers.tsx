"use client";

// The nested guard wrappers (TP1-06), reading ONLY from AuthProvider (useAuth) and applying the pure
// decisions. They are a UX/composition layer: the authoritative enforcement is the middleware early redirect,
// the (app) server layout, the manager route's server role check, the API 403, and RLS (ADR-0012). So a
// wrapper redirect that a client briefly skips is never an exposure — it is belt-and-suspenders on top of the
// server layers. RequireMfa and RequireTerms are NOT client wrappers: MFA is enforced by the middleware aal
// gate (ADR-0009), and terms by restrictive RLS with the guard slot inert until its screen lands (ADR-0012),
// because AuthProvider carries only { authenticated, role, status }, not aal or terms acceptance.

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/useAuth";
import type { AdminRole } from "@/lib/roles";
import { decidePublicOnly, decideRequireActive, decideRequireRole, decideRequireSession } from "./decisions";

/** Redirect once on the client when `to` is set; render nothing while it happens. */
function useClientRedirect(to: string | null): void {
  const router = useRouter();
  useEffect(() => {
    if (to) router.replace(to);
  }, [to, router]);
}

/** PublicOnly — a signed-in administrator is sent into the app; an anonymous visitor sees the children. */
export function PublicOnly({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  // basePath-relative: Next (useRouter/router.replace) prepends the "/admin" basePath automatically.
  const to = decidePublicOnly({ authenticated: isAuthenticated }) === "to-app" ? "/" : null;
  useClientRedirect(to);
  return to ? null : <>{children}</>;
}

/** RequireSession — renders the children only for a signed-in administrator, else redirects to sign-in. */
export function RequireSession({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const to = decideRequireSession({ authenticated: isAuthenticated }) === "sign-in" ? "/sign-in" : null;
  useClientRedirect(to);
  return to ? null : <>{children}</>;
}

/** RequireActive — renders for an active administrator; a deactivated/invited one is routed away. */
export function RequireActive({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const action = decideRequireActive({ authenticated: isAuthenticated, status: user?.status ?? null });
  const to = action === "sign-in" || action === "deactivated" ? "/sign-in" : null;
  useClientRedirect(to);
  return to ? null : <>{children}</>;
}

/**
 * RequireRole — renders the children only for the required role; otherwise the `fallback` (default: nothing).
 * Use it to gate a manager-only SECTION inside a shared page (e.g. a button); the route-level forbidden screen
 * is handled by the middleware/server layer, so this wrapper deliberately does not redirect.
 */
export function RequireRole({
  role,
  children,
  fallback = null,
}: {
  role: AdminRole;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { user, isAuthenticated } = useAuth();
  const allowed = decideRequireRole({ authenticated: isAuthenticated, role: user?.role ?? null }, role) === "allow";
  return <>{allowed ? children : fallback}</>;
}
