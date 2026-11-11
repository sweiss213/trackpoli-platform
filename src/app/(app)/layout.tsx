import { redirect } from "next/navigation";
import { requireUser } from "@/features/auth/session";
import { decideRequireActive } from "@/features/auth/guards/decisions";
import { AppShell } from "@/features/shell/AppShell";

// The authenticated route group's layout (TP1-06). Every page inside it renders within the admin shell and
// behind the session + active guards. Enforcement is layered (ADR-0012): the middleware already redirected an
// unauthenticated/unverified/manager-forbidden request before this runs; this is the server-side defense that
// also holds when middleware is bypassed, and RLS is the real boundary for the data. Role gating for the
// manager route lives on that route itself; here we only require a signed-in, non-deactivated administrator.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(); // redirects to sign-in when there is no session
  const active = decideRequireActive({ authenticated: true, status: user.status });
  if (active === "deactivated") redirect("/sign-in"); // no deactivated screen yet; the session is dead to RLS
  // "onboarding" (invited) and "allow" both render for now — the invite/onboarding flow is a later ticket.

  return <AppShell displayName={user.email ?? "Administrator"}>{children}</AppShell>;
}
