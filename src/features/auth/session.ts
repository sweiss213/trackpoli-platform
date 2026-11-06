// Server-side session helpers (ADR-0005). getSessionUser reads the current user from the HttpOnly cookie
// session on the server (getUser revalidates with the auth server, not just the cookie). requireUser is
// the guard a protected Server Component / Route Handler calls to enforce a signed-in administrator,
// redirecting to the sign-in screen otherwise. getSessionUser no-ops to null when Supabase env is absent,
// so build/SSR without secrets does not crash. Role/status stay null until the access-token claims are
// wired; they are for routing only, never authorization (the database decides access).

import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createServerSupabase } from "@/lib/supabase/server";
import type { AuthUser } from "./AuthProvider";

export async function getSessionUser(): Promise<AuthUser | null> {
  if (!hasSupabaseEnv()) return null;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? null, role: null, status: null };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getSessionUser();
  if (!user) redirect("/admin/sign-in");
  return user;
}
