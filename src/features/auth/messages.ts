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
