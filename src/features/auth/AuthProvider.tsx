"use client";

// Client-side auth context (ADR-0005). The browser never calls Supabase and never holds a token; this
// provider simply carries the server-resolved user down to client components so they can render for the
// right person. The user is read on the server (from the HttpOnly cookie session) and passed in as a
// prop; this component holds no secret and makes no network call. Authorization is still the database's
// job — `role`/`status` here are for rendering/routing only.

import { createContext, type ReactNode } from "react";
import type { AdminRole, AdminStatus } from "@/lib/roles";

export interface AuthUser {
  readonly id: string;
  readonly email: string | null;
  // From the access-token claims (app_role/app_status, migration 006), read server-side and passed down
  // (TP1-06). Routing/rendering only, never authorization — the database (RLS) decides access. Null when the
  // claim is absent or unreadable (e.g. a user with no profile row, whom the hook stamps 'none').
  readonly role: AdminRole | null;
  readonly status: AdminStatus | null;
}

export interface AuthState {
  readonly user: AuthUser | null;
  readonly isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ user, children }: { user: AuthUser | null; children: ReactNode }) {
  const value: AuthState = { user, isAuthenticated: user !== null };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
