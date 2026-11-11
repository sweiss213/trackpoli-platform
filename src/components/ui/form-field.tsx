"use client";

import * as React from "react";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// FormField — the shared label + input + hint + error primitive (TP1-07, replaces the hand-built
// TextField). It owns the accessibility wiring required by universal-accessibility-wcag
// (accessible-forms-and-errors): the <label> is programmatically associated via htmlFor/id, the hint and
// the error are linked to the input with aria-describedby (so a screen reader reads them with the field),
// and an error sets aria-invalid (which the Input styles as the 2px error outline). We deliberately do NOT
// put role="alert" on the per-field error: the form-level Banner/Alert announces the submit error once,
// and per-field live regions would double-announce (the pattern the sign-in/MFA screens already use).
//
// Presentation only: the parent owns value and handlers. `trailing` is an in-field adornment slot
// (e.g. the password visibility toggle); it sits inside the field so it does not break the label/control pair.

export interface FormFieldProps extends Omit<React.ComponentProps<"input">, "id"> {
  /** The visible, programmatically-associated label. Required — every field has a visible label. */
  label: string;
  /** Optional helper text shown below the field and read via aria-describedby. */
  hint?: string;
  /** When set, the field is invalid: the message is shown, linked via aria-describedby, and aria-invalid is set. */
  error?: string;
  /** Optional in-field trailing adornment (icon button, etc.). */
  trailing?: React.ReactNode;
  /** Optional id override; a stable generated id is used otherwise. */
  id?: string;
  /** Class for the outer wrapper. */
  containerClassName?: string;
}

export function FormField({
  label,
  hint,
  error,
  trailing,
  id: idProp,
  className,
  containerClassName,
  ...inputProps
}: FormFieldProps) {
  const reactId = React.useId();
  const id = idProp ?? reactId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId, inputProps["aria-describedby"]].filter(Boolean).join(" ") || undefined;

  const bodySmall =
    "text-[length:var(--md-body-small-size)] leading-[var(--md-body-small-line)] tracking-[var(--md-body-small-tracking)]";

  return (
    <div className={cn("flex flex-col gap-1.5", containerClassName)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(trailing && "pr-14", className)}
          {...inputProps}
        />
        {trailing ? (
          <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>
        ) : null}
      </div>
      {hint && !error ? (
        <p id={hintId} className={cn(bodySmall, "text-muted-foreground")}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={cn(bodySmall, "text-destructive")}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
