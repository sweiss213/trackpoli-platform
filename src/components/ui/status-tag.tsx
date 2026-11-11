import * as React from "react";

import { cn } from "@/lib/utils";

// StatusTag — the admin account-status chip (TP1-07; Figma 689:62, variants 917:65411/65413/65415). The
// three admin statuses from the admin_status enum (migration 001): Active is a filled secondary-container
// chip; Invited is a solid-outline chip; Deactivated is a dashed-outline chip (the design distinguishes the
// two non-active states by border style, so a screen reader is not relied on for colour — WCAG 1.4.1). The
// status word is the text, so the chip is not colour-only. Colour via semantic tokens; label-small type.
//
// Scope: only the admin statuses here. The Phase 2 record/workflow statuses (Draft, Verified, Published, …)
// extend this component when their error-container token and screens land.

export type AdminStatusValue = "active" | "invited" | "deactivated";

const VARIANT: Record<AdminStatusValue, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-secondary text-secondary-foreground" },
  invited: { label: "Invited", className: "border border-border bg-card text-foreground" },
  deactivated: { label: "Deactivated", className: "border border-dashed border-border bg-card text-foreground" },
};

export function StatusTag({
  status,
  className,
  ...props
}: { status: AdminStatusValue } & React.ComponentProps<"span">) {
  const variant = VARIANT[status];
  return (
    <span
      data-slot="status-tag"
      data-status={status}
      className={cn(
        "inline-flex items-center rounded-[8px] px-2.5 py-1 whitespace-nowrap",
        "text-[length:var(--md-label-small-size)] font-medium leading-[var(--md-label-small-line)] tracking-[var(--md-label-small-tracking)]",
        variant.className,
        className,
      )}
      {...props}
    >
      {variant.label}
    </span>
  );
}
