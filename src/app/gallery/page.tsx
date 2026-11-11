"use client";

// Component gallery (TP1-07, the ticket's optional gallery page). A credential-free showcase of every
// shared component in its states, used for visual review and as the axe target for E2E-14 (it renders the
// design system without the authenticated data stack). It is not in the (app) route group, so it has no
// session guard; in production middleware still gates /admin/* behind auth, and locally (no Supabase env)
// it renders directly. Every control here is a real design-system component, so the page doubles as a
// manual keyboard (E2E-13) and screen-reader check surface.

import { useState } from "react";
import { notFound } from "next/navigation";

import { AuthProvider, type AuthUser } from "@/features/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { PasswordField } from "@/components/ui/password-field";
import { OtpField } from "@/components/ui/otp-field";
import { StatusTag } from "@/components/ui/status-tag";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/states";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SnackbarProvider, useSnackbar } from "@/components/ui/snackbar";
import { PageHeader } from "@/features/shell/PageHeader";
import { SideNav } from "@/features/shell/SideNav";

const MANAGER: AuthUser = { id: "demo", email: "manager@example.test", role: "admin_manager", status: "active" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-b border-border py-8">
      <h2 className="text-[length:var(--md-title-medium-size)] font-medium leading-[var(--md-title-medium-line)] tracking-[var(--md-title-medium-tracking)] text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Interactive() {
  const { show } = useSnackbar();
  const [code, setCode] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Form fields">
        <div className="flex max-w-md flex-col gap-4">
          <FormField label="Email address" type="email" autoComplete="username" placeholder="you@example.com" />
          <FormField label="Display name" hint="Shown to other administrators." defaultValue="Ada Lovelace" />
          <FormField label="Registration number" error="Enter a valid registration number" defaultValue="abc" />
          <PasswordField label="Password" autoComplete="current-password" />
          <OtpField label="Verification code" value={code} onValueChange={setCode} />
        </div>
      </Section>

      <Section title="Status tags">
        <div className="flex flex-wrap items-center gap-3">
          <StatusTag status="active" />
          <StatusTag status="invited" />
          <StatusTag status="deactivated" />
        </div>
      </Section>

      <Section title="Page states">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[var(--md-shape-field)] border border-border">
            <EmptyState title="No records yet" body="Add your first record to get started." />
          </div>
          <div className="rounded-[var(--md-shape-field)] border border-border">
            <LoadingState />
          </div>
          <div className="rounded-[var(--md-shape-field)] border border-border">
            <ErrorState action={<Button variant="secondary">Try again</Button>} />
          </div>
        </div>
      </Section>

      <Section title="Page header">
        <PageHeader
          title="Politicians"
          breadcrumbs={[{ label: "Records", href: "/admin" }, { label: "Politicians" }]}
          actions={<Button variant="secondary">New record</Button>}
        />
      </Section>

      <Section title="Feedback">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => show({ message: "Changes saved" })}>
            Show snackbar
          </Button>
          <Button
            variant="secondary"
            onClick={() => show({ message: "Record deleted", action: { label: "Undo", onClick: () => show({ message: "Restored" }) } })}
          >
            Snackbar with undo
          </Button>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            Open confirm dialog
          </Button>
        </div>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Deactivate administrator?"
          body="They will be signed out of all sessions immediately and lose access until reactivated."
          confirmLabel="Deactivate"
          destructive
          onConfirm={() => {
            setConfirmOpen(false);
            show({ message: "Administrator deactivated" });
          }}
        />
      </Section>

      <Section title="Side navigation (Administrator Manager)">
        <div className="h-[600px] w-[280px] overflow-hidden rounded-[var(--md-shape-field)] border border-border">
          <AuthProvider user={MANAGER}>
            <SideNav displayName="Ada Lovelace" />
          </AuthProvider>
        </div>
      </Section>
    </>
  );
}

export default function GalleryPage() {
  // Development/test surface only: never served in a normal production build (removes the prod-reachable demo
  // route the judge-arch review flagged LOW). E2E runs against `next dev`, so it renders there; a dedicated
  // perf/axe build can opt in with NEXT_PUBLIC_ENABLE_GALLERY=1 to let Lighthouse/axe measure the shell.
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_ENABLE_GALLERY !== "1") notFound();

  return (
    <SnackbarProvider>
      <main className="mx-auto flex max-w-4xl flex-col px-4 py-10">
        <h1 className="text-[length:var(--md-headline-medium-size)] font-normal leading-[var(--md-headline-medium-line)] tracking-[var(--md-headline-medium-tracking)] text-foreground">
          TrackPoli Admin — component gallery
        </h1>
        <p className="mt-2 text-[length:var(--md-body-medium-size)] leading-[var(--md-body-medium-line)] tracking-[var(--md-body-medium-tracking)] text-muted-foreground">
          The shared design-system components (TP1-07). Grayscale MD3 tokens; shadcn/ui primitives.
        </p>
        <Interactive />
      </main>
    </SnackbarProvider>
  );
}
