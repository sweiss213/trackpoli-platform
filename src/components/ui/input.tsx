import * as React from "react";

import { cn } from "@/lib/utils";

// shadcn/ui Input, themed to the MD3 grayscale tokens (ADR-0011/ADR-0006): 56px control, outline border,
// field radius, body-medium type; focus moves the border to the on-surface colour; aria-invalid draws the
// 2px error outline (padding reduced 1px so the content does not shift), matching the hand-built TextField.
// Colours come from the semantic token utilities, so no colour literal lives here.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-[56px] w-full min-w-0 rounded-[var(--md-shape-field)] border border-ring bg-background px-4 text-foreground outline-none transition-colors",
        "text-[length:var(--md-body-medium-size)] leading-[var(--md-body-medium-line)] tracking-[var(--md-body-medium-tracking)]",
        "placeholder:text-muted-foreground",
        "focus-visible:border-foreground",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "aria-invalid:border-2 aria-invalid:border-destructive aria-invalid:px-[15px]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
