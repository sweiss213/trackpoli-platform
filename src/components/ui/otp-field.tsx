"use client";

import * as React from "react";

import { FormField, type FormFieldProps } from "@/components/ui/form-field";

// OtpField — the shared one-time-code field (TP1-07). It formalises the pattern the MFA screens already
// ship and that the team chose deliberately: a SINGLE labelled input with autocomplete="one-time-code" and
// inputmode="numeric", NOT segmented boxes. A single input stays WCAG-AA, is announced sanely by a screen
// reader, and works with password managers and the OS SMS/authenticator autofill (universal-accessibility-wcag,
// as noted in MfaVerifyPage). "Paste the whole code" works for free — a pasted string is digit-filtered and
// length-capped in onChange; "auto-advance" is inherent to a single field.
//
// Controlled: the parent owns `value`; onValueChange receives the cleaned digits only.

export interface OtpFieldProps
  extends Omit<FormFieldProps, "value" | "onChange" | "type" | "inputMode" | "maxLength" | "pattern"> {
  value: string;
  onValueChange: (digits: string) => void;
  /** Number of digits (default 6). */
  length?: number;
}

export function OtpField({
  value,
  onValueChange,
  length = 6,
  autoComplete = "one-time-code",
  ...fieldProps
}: OtpFieldProps) {
  return (
    <FormField
      {...fieldProps}
      type="text"
      inputMode="numeric"
      autoComplete={autoComplete}
      pattern={`\\d{${length}}`}
      maxLength={length}
      value={value}
      onChange={(event) => onValueChange(event.target.value.replace(/\D/g, "").slice(0, length))}
    />
  );
}
