import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// shadcn/ui Alert, themed to the MD3 grayscale "banner" (ADR-0011/ADR-0006): an inline notice with
// role="alert" so a screen reader announces it when it appears, an optional leading icon, and the
// surface-container-highest background at the banner radius. Matches the hand-built Banner's look and a11y.
// Colours come from the semantic token utilities (accent === surface-container-highest), so no colour
// literal lives here.
const alertVariants = cva(
  "relative flex w-full items-center gap-3 rounded-[var(--md-shape-banner)] bg-accent px-4 py-3 text-foreground [&>svg]:size-[22px] [&>svg]:shrink-0 [&>img]:size-[22px] [&>img]:shrink-0",
  {
    variants: {
      variant: {
        default: "",
        // The error banner keeps the neutral grayscale surface (the icon carries the error meaning),
        // exactly as the hand-built Banner does until the colour theme lands.
        destructive: "",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("font-medium tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="alert-description"
      className={cn(
        "m-0 min-w-0 flex-1 text-[length:var(--md-body-medium-size)] leading-[var(--md-body-medium-line)] tracking-[var(--md-body-medium-tracking)] text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
