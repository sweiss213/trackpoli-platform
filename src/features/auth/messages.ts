// Display strings for the sign-in screens. Client-safe (no server imports) and kept in one place so the
// copy matches the design and is straightforward to localise later (next-intl). The generic error never
// reveals which credential was wrong or whether the email exists (ADR-0005).

export const SIGN_IN_MESSAGES = {
  genericError: "The email or password you entered is incorrect.",
  verificationNeeded: "Please complete the verification and try again.",
  rateLimited: "Too many attempts. Please wait and try again.",
  attemptsRemaining: (n: number) =>
    `${n} ${n === 1 ? "attempt" : "attempts"} remaining before this account is temporarily locked.`,
} as const;

// Password-recovery copy (ADR-0008). The request acknowledgement is deliberately the same whether or not an
// account exists, so it never reveals which emails are registered. Final visual copy is reconciled with the
// recovery-screen designs; these strings keep the backend flow usable and enumeration-safe in the meantime.
export const PASSWORD_RESET_MESSAGES = {
  requestAcknowledged:
    "If an account exists for that email, we've sent a link to reset the password. Check your inbox.",
  verificationNeeded: "Please complete the verification and try again.",
  rateLimited: "Too many requests. Please wait and try again.",
  linkExpired: "This password reset link is invalid or has expired. Please request a new one.",
  weakPassword: "Please choose a password with at least 12 characters.",
  genericError: "Something went wrong. Please try again.",
  resetComplete: "Your password has been reset. Please sign in with your new password.",
} as const;
