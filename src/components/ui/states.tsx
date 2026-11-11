import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

// Page/list state components (TP1-07): the empty, loading and error states every list screen reuses. They
// are design-system primitives, so they carry generic English defaults (overridable via props) rather than
// importing feature copy — the dependency only ever points lib/ui -> never ui -> features. Accessibility
// (universal-accessibility-wcag): LoadingState is a polite live region with a text label (the spinner is
// decorative); EmptyState/ErrorState use a section heading so the state is announced in the page outline.

const bodyMedium =
  "text-[length:var(--md-body-medium-size)] leading-[var(--md-body-medium-line)] tracking-[var(--md-body-medium-tracking)]";
const titleMedium =
  "text-[length:var(--md-title-medium-size)] font-medium leading-[var(--md-title-medium-line)] tracking-[var(--md-title-medium-tracking)]";

function StateShell({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-16 text-center", className)}>
      {children}
    </div>
  );
}

export function EmptyState({
  icon,
  title = "Nothing here yet",
  body,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title?: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <StateShell className={className}>
      {icon ? <span className="text-muted-foreground" aria-hidden="true">{icon}</span> : null}
      <h2 className={cn(titleMedium, "text-foreground")}>{title}</h2>
      {body ? <p className={cn(bodyMedium, "max-w-prose text-muted-foreground")}>{body}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </StateShell>
  );
}

export function LoadingState({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <StateShell className={className}>
      <div role="status" aria-live="polite" className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
        <span className={cn(bodyMedium, "text-muted-foreground")}>{label}</span>
      </div>
    </StateShell>
  );
}

export function ErrorState({
  icon,
  title = "Something went wrong",
  body = "This could not be loaded. Please try again.",
  action,
  className,
}: {
  icon?: React.ReactNode;
  title?: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <StateShell className={className}>
      {icon ? <span className="text-muted-foreground" aria-hidden="true">{icon}</span> : null}
      <h2 className={cn(titleMedium, "text-foreground")}>{title}</h2>
      {body ? <p className={cn(bodyMedium, "max-w-prose text-muted-foreground")}>{body}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </StateShell>
  );
}
