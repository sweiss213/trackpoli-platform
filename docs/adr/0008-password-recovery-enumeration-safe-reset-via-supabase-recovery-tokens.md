# 0008. Password recovery: enumeration-safe reset via Supabase recovery tokens and a shared Continue page

Date: 2026-11-05

## Status

Accepted

## Context

Ticket TP1-03 ("Recover a forgotten password", plan task P1-07) adds the first account-recovery surface
and the first feature that sends email. It builds on the TP1-02 auth infrastructure (ADR-0005): the
cookie session, the pre-authentication edge-function pattern, Turnstile, the per-account lockout, and the
`clear_sign_in_failures` helper landed in TP1-01. Several decisions must be fixed before code because they
shape the whole flow and reuse the TP1-02 security posture:

- **Enumeration.** A reset request that answers differently for a registered vs an unregistered address —
  in wording *or* in timing — lets an attacker walk a list and learn which emails have accounts (the user
  story requires the opposite, and this is the OWASP Forgot Password control). Google-only accounts have
  no password to recover and must not be distinguishable either.
- **The reset token.** It must be cryptographically random, bound to one user, single-use, and short-lived
  (NFR-S8: single-use, expires within 24h). A short, guessable, or reusable token is account takeover.
- **One-time links vs email scanners.** Corporate mail gateways and link-prefetchers follow URLs in email.
  A reset link that performs the token exchange on GET would be consumed by a scanner before the human
  clicks, burning the single-use token.
- **No new denial-of-service tools.** Locking or changing an account on the *request* alone (before a valid
  token) turns the reset form into a way to lock out any known user, and uncapped requests flood an inbox.
- **No email can be sent yet.** The sending domain (SPF/DKIM/DMARC) and Porkbun SMTP are domain-blocked
  (Q-1-21) and depend on accounts the user provisions.

## Decision

- **Use Supabase Auth's built-in recovery-token email flow, not a hand-rolled token table.** Supabase
  generates the crypto-random, single-use, time-limited token, stores it hashed, and owns expiry
  (`config.toml` `auth.email`: confirmations on, one expiry setting, 24h per NFR-S8). We do not mint,
  store, or compare reset tokens ourselves.
- **Recovery links land on a shared `/admin/auth/confirm` Continue page** (already in
  `additional_redirect_urls`), reused by TP1-09. The page performs the token exchange only after an
  explicit user gesture (a "Continue" click), so an email scanner that merely fetches the URL cannot
  consume the one-time token. On success it establishes the recovery session and routes to the reset
  screen; a consumed, expired, or invalid token shows the link-expired state and creates no session.
- **`request-password-reset` is a pre-authentication edge function** (gated by `assertInternalCall`,
  `verify_jwt = false`, composing `_shared`), following the `sign-in-check` shape. It verifies Turnstile,
  enforces rate limits (**5/hr per email, 20/hr per IP**), and then **returns one identical response with a
  uniform minimum-duration timing floor whether or not the address has an account**. Only a real, `active`,
  password-capable account actually triggers the Supabase recovery email; an unknown address, a non-active
  account, and a Google-only (passwordless) account all return the same screen and send no mail. It is
  enumeration-safe by reading only what it needs and never revealing account state to the caller.
- **The request changes nothing.** No lockout, no account mutation, no state change happens on a reset
  request — only on presentation of a valid token — so the flow cannot be used to lock out or probe users.
- **Reset completion requires the recovery session, applies the shared policy, and does not auto-login.**
  The new password is entered twice, must meet the same 12-character policy enforced everywhere
  (`config.toml` `minimum_password_length = 12`, NFR-S2); on success the flow **signs out all sessions**
  (no auto-login — user returns to the normal sign-in), **clears the lockout counter**
  (`clear_sign_in_failures`), and writes a `password_reset_completed` event. A "your password changed"
  notification email is sent; the password is never in any email.
- **SMTP and the sending domain are built in-repo and provisioned later.** The recovery email template and
  the whole flow are implemented and tested now against the temporary URL; configuring SPF/DKIM/DMARC +
  Porkbun SMTP in Supabase Auth and testing deliverability to Gmail/Outlook is domain-blocked (Q-1-21) and
  recorded in a setup doc, done when the domain and accounts exist. This mirrors the TP1-02 deferral.

Rejected alternatives:

- **Hand-rolled reset-token table + custom token generation/compare.** Reimplements exactly what Supabase
  already provides safely (CSPRNG token, single-use, expiry, hashed-at-rest), adds attack surface and a
  second thing to keep correct, and is easy to get subtly wrong. Rejected.
- **A direct reset link that exchanges the token on GET (no Continue page).** Email security scanners and
  link-prefetchers would consume the single-use token before the user clicks, breaking recovery for exactly
  the security-conscious organizations most likely to run such scanners. Rejected in favour of the gesture-
  gated Continue page.
- **Auto-login immediately after reset.** Convenient but adds session-handling edge cases and is the
  opposite of the OWASP guidance (send the user to normal login, end existing sessions). Rejected.
- **Distinct "no account found" response, or locking the account on request.** Each directly violates a
  Forgot Password control (enumeration; request-time DoS). Rejected.

## Consequences

Reusing Supabase's token machinery means far less security-critical code to own, but it ties link lifetime
to Supabase's single expiry setting — we get one 24h expiry for recovery and invite links, not a different
expiry per link type (24h satisfies NFR-S8, so this is acceptable). The Continue page costs the user one
extra click on an otherwise-direct link; that cost is deliberate (it is what defeats scanner consumption)
and is shared with TP1-09. Uniform timing is best-effort, the same honest limit as ADR-0005: network
jitter and function cold starts can still vary observed time, so the "indistinguishable" property is
asserted by the E2E-05 end-to-end test, not proven absolutely. The entire mail path — deliverability,
SPF/DKIM/DMARC alignment, and the final link domain — cannot be proven until the sending domain and SMTP
land (Q-1-21, domain-blocked); until then the flow is unit- and e2e-tested against the temporary URL and
the recovery email is verified as a rendered template, not as delivered mail. Because reset completion
ends all sessions, a legitimate user who resets while signed in elsewhere is logged out everywhere by
design.
