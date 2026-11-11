"use client";

// Shell demo (TP1-07). Renders the full authenticated AppShell with a mock AuthProvider so the responsive
// frame — the skip link, the >=1024px rail, the <1024px drawer, and the focus-trapping nav — can be
// exercised credential-free by E2E-13 (keyboard) and E2E-14 (axe). Not in the (app) route group, so no
// session guard; locally (no Supabase env) it renders directly, and in production middleware gates /admin/*.
// This is a test/demo surface, never a real screen.

import { notFound } from "next/navigation";

import { AuthProvider, type AuthUser } from "@/features/auth/AuthProvider";
import { AppShell } from "@/features/shell/AppShell";
import { PageHeader } from "@/features/shell/PageHeader";

const MANAGER: AuthUser = { id: "demo", email: "manager@example.test", role: "admin_manager", status: "active" };

export default function ShellDemoPage() {
  // Development/test surface only: never served in a normal production build (resolves the judge-arch LOW
  // finding about a prod-reachable demo route). E2E runs against `next dev`, so it renders there; a dedicated
  // perf build can opt in with NEXT_PUBLIC_ENABLE_GALLERY=1 so Lighthouse can measure the shell's LCP (NFR-P1).
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_ENABLE_GALLERY !== "1") notFound();

  return (
    <AuthProvider user={MANAGER}>
      <AppShell displayName="Ada Lovelace">
        <div className="p-8">
          <PageHeader title="Dashboard" actions={undefined} />
          <p className="mt-4 text-[length:var(--md-body-medium-size)] leading-[var(--md-body-medium-line)] tracking-[var(--md-body-medium-tracking)] text-muted-foreground">
            Demo content rendered inside the admin workspace shell.
          </p>
        </div>
      </AppShell>
    </AuthProvider>
  );
}
