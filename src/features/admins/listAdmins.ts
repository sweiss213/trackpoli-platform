// Manager-only read of the administrator list (TP1-06). The route handler calls this; it never touches the
// database itself (decisions.md: UI/route -> service -> lib). Two layers protect it: this checks the role
// claim and returns "forbidden" for a non-manager, AND the RLS profiles_select_manager policy means even if
// that check were bypassed a non-manager's select returns only their own row, never the full list. The role
// claim is for the clean 403; RLS is the real boundary (ADR-0012).

import { createServerSupabase, readAdminClaims } from "@/lib/supabase/server";
import { MANAGER_ROLE } from "@/lib/roles";
import { report } from "@/lib/report";

export interface AdminRow {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: string;
  readonly status: string;
}

export type ListAdminsResult =
  | { readonly outcome: "ok"; readonly admins: AdminRow[] }
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "error" };

export async function listAdmins(): Promise<ListAdminsResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { outcome: "unauthenticated" };

  const { role } = await readAdminClaims(supabase);
  if (role !== MANAGER_ROLE) return { outcome: "forbidden" };

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, status")
    .order("email");
  if (error) {
    report("warning", "list admins failed", { reason: error.message });
    return { outcome: "error" };
  }
  return {
    outcome: "ok",
    admins: (data ?? []).map((row) => ({
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      status: row.status,
    })),
  };
}
