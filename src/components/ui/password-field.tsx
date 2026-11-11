"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { FormField, type FormFieldProps } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";

// PasswordField — a FormField with a show/hide toggle (TP1-07). Accessibility (universal-accessibility-wcag):
// the toggle is a real <button> (keyboard-operable), carries aria-pressed for its on/off state and an
// aria-label that is a whole sentence (never a concatenation), and swaps the input type in place so no
// overlay is revealed (keeps WCAG 1.4.13 n/a). Paste is allowed (we never block it — blocking paste harms
// password managers, owasp-secure-coding-bdd), and autocomplete is set by the caller per use
// ("current-password" on sign-in, "new-password" on reset).

export interface PasswordFieldProps extends Omit<FormFieldProps, "type" | "trailing"> {
  /** Label for the visibility toggle when the password is hidden (whole sentence; defaults to en-GB copy). */
  showLabel?: string;
  /** Label for the visibility toggle when the password is shown (whole sentence; defaults to en-GB copy). */
  hideLabel?: string;
}

export function PasswordField({
  showLabel = "Show password",
  hideLabel = "Hide password",
  autoComplete,
  ...fieldProps
}: PasswordFieldProps) {
  const [visible, setVisible] = React.useState(false);

  const toggle = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-pressed={visible}
      aria-label={visible ? hideLabel : showLabel}
      onClick={() => setVisible((v) => !v)}
      className="h-11 w-11"
    >
      {visible ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
    </Button>
  );

  return (
    <FormField
      {...fieldProps}
      type={visible ? "text" : "password"}
      autoComplete={autoComplete}
      trailing={toggle}
    />
  );
}
