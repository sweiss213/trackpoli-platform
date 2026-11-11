import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// shadcn/ui Button, themed to the Material Design 3 grayscale tokens (ADR-0011, ADR-0006). The semantic
// Tailwind colour utilities resolve 1:1 to the MD3 roles via the token mapping in src/styles/tokens.css,
// so there is no colour literal here. Shape/size match the hand-built MD3 button (56px control, pill
// radius, label-large type, 2px focus outline offset 2px). Lives at button/index.tsx (imported as
// `@/components/ui/button`) so it does not case-collide with the hand-built Button.tsx on a
// case-insensitive filesystem during the migration; PR 7 flattens it to button.tsx when Button.tsx is
// deleted.
//
// Variants map to the MD3 roles the design uses: `secondary` is the filled action (secondary-container,
// grey — the role the sign-in "filled" button uses until the brand colour lands, ADR-0006); `outline` is
// the neutral action (e.g. "Continue with Google"); `ghost` is used for icon-only affordances such as the
// password visibility toggle.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-3 whitespace-nowrap rounded-[var(--md-shape-button)] font-medium transition-[filter,background-color,color] cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:brightness-110",
        secondary: "bg-secondary text-secondary-foreground hover:brightness-[0.97]",
        outline: "bg-background text-foreground border border-ring hover:bg-muted",
        ghost: "bg-transparent text-foreground hover:bg-muted rounded-full",
        destructive: "bg-destructive text-destructive-foreground hover:brightness-110",
        link: "bg-transparent text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[56px] px-6 text-[length:var(--md-label-large-size)] leading-[var(--md-label-large-line)] tracking-[var(--md-label-large-tracking)]",
        sm: "h-10 px-4 text-[length:var(--md-label-large-size)]",
        icon: "h-11 w-11 p-0",
        // Text / icon-text actions (e.g. "Sign out", a back link) that size to their content and bring
        // their own padding via a composed className; no fixed control height.
        inline: "h-auto w-auto p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  type,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      // A real <button> defaults to type="button" (never an accidental form submit); asChild passes through.
      type={asChild ? type : (type ?? "button")}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
