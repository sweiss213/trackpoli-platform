import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/features/auth/session";
import { MANAGER_ROLE } from "@/lib/roles";
import { Placeholder } from "@/features/shell/Placeholder";

export const metadata: Metadata = { title: "Admin management · TrackPoli Admin" };

// The manager-only Admin management route (TP1-06, E2E-08). The middleware already redirects a non-manager to
// /forbidden; this server-side role check is the defense-in-depth that also holds if middleware is bypassed.
// The admin-management actions (invite, roles, deactivate) are their own ticket; this is the guarded shell.
export default async function Page() {
  const user = await requireUser();
  // basePath-relative path (next/navigation redirect() prepends "/admin"); ?from is display-only, so it keeps the real /admin path.
  if (user.role !== MANAGER_ROLE) redirect("/forbidden?from=/admin/admins");
  return (
    <Placeholder
      title="Admin management"
      note="Managing administrators (invite, roles, deactivate) arrives in its own ticket."
    />
  );
}
