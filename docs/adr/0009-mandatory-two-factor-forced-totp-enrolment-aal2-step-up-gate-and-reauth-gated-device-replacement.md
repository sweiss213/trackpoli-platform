# 0009. Mandatory two-factor: forced TOTP enrolment, an AAL2 step-up gate, and re-auth-gated device replacement

Date: 2026-11-06

## Status

Accepted

## Context

Ticket TP1-04 ("Two-factor protection", plan task P1-10) makes TOTP two-factor mandatory for every
administrator (NFR-S6, Q-1-01). It builds on infrastructure already landed:

- **The AAL2 data gate exists and is authoritative (TP1-01).** `public.is_aal2()` (migration 001) reads
  the `aal` claim, and every RLS policy except own-profile-read and the terms screen requires it
  (migrations 005, 009). So an administrator authenticated at `aal1` can hold a session but cannot read or
  write any real data until a second factor lifts them to `aal2`. This is the real authorization boundary.
- **MFA-factor audit triggers exist (TP1-01).** `on_auth_mfa_change` (migration 007) writes
  `auth.mfa_enrolled` / `auth.mfa_removed` events on any change to `auth.mfa_factors`.
- **Supabase MFA is enabled (config.toml).** `[auth.mfa.totp] enroll_enabled = true, verify_enabled = true`.
- **The cookie-session auth model (ADR-0005).** `src/lib/supabase/server.ts` is the only place a session is
  read/written; middleware guards routes; access is always decided from `profiles`/RLS, never a token claim.
- **Google OAuth exists (ADR-0005).** `startGoogleOAuth` / `completeOAuthCallback`; a Google-only account
  has no password (the same fact that made it unrecoverable in ADR-0008).

Several decisions must be fixed before code because they shape the whole flow:

- **What satisfies "re-authenticate" for a passwordless account.** The ticket specifies device replacement
  as "password + current code", but a Google-only administrator has no password, so a literal password step
  is impossible for them. The control must re-prove identity for *every* account type without inventing a
  credential.
- **Where the gate lives.** A route-level "you must have 2FA" redirect is a UX affordance; if it were
  treated as the authorization boundary it would duplicate — and could silently diverge from — the RLS
  `is_aal2()` gate that already decides access.
- **Enrolment must cover Google sign-ins too**, not just password sign-ins (Task Goal 1).
- **Lost vs replaced authenticator are different risks.** A user who still has their current code is a
  low-risk self-service replacement; a user who has lost the device is a recovery event and must not be a
  self-service MFA bypass.
- **No out-of-band email yet.** A "your two-factor device changed" notification depends on SMTP + the
  sending domain, which are domain-blocked (Q-1-21, ADR-0008).

## Decision

- **Use Supabase Auth's native TOTP MFA, not a hand-rolled authenticator.** `supabase.auth.mfa`
  (`enroll`, `challenge`, `verify` / `challengeAndVerify`, `getAuthenticatorAssuranceLevel`, `listFactors`,
  `unenroll`) owns secret generation, the QR/`otpauth://` provisioning URI, code verification, and the
  `aal1 -> aal2` session upgrade. We do not implement TOTP, store secrets, or compare codes ourselves. This
  mirrors ADR-0008's "use Supabase, don't hand-roll the security-critical machinery".
- **Two tiers, one boundary. The RLS `is_aal2()` gate stays the authorization boundary; `RequireMfa` is a
  routing layer only.** A new check in `src/middleware.ts` redirects by assurance level, purely so the user
  lands on the right screen — it never decides data access. Even if the redirect were bypassed, RLS still
  denies every `aal1` request, so the route gate cannot become a false source of truth (decisions.md: "the
  token/route is for routing only, never authorization").
- **The gate reads assurance level, not a hand-kept flag.** `RequireMfa` uses
  `getAuthenticatorAssuranceLevel()` `{ currentLevel, nextLevel }`: `currentLevel === "aal2"` → allow;
  `aal1` with `nextLevel === "aal2"` (a verified factor exists) → redirect to `/sign-in/verify`;
  `nextLevel === "aal1"` (no verified factor) → redirect to `/mfa/enrol`. Enrolment, the verify screen, the
  OAuth routes, sign-in and sign-out are exempt so the funnel cannot deadlock.
- **Forced enrolment is provider-agnostic — Google is covered by construction.** A freshly signed-in
  administrator (password *or* Google) with no verified factor is at `aal1` with `nextLevel === "aal1"`, so
  the same gate routes them to `/mfa/enrol` before any data route resolves. No separate Google path is
  needed; enrolment confirms with `challengeAndVerify`, which lifts the session to `aal2`.
- **Device replacement re-authenticates with a credential the account actually has, plus the current code
  (OWASP MFA "Changing MFA factors"; Authentication "Re-authentication for sensitive features").** The
  session alone is never trusted (it may be hijacked). Email administrators re-enter their **password**;
  Google-only administrators **re-authenticate through Google**; both additionally pass a **current TOTP
  code**. Only then does the flow enroll the new factor, verify it, and `unenroll` the old one, leaving
  exactly one verified factor. OWASP Authentication item 11 names "an authenticator already bound to the
  account (current password **or passkey**)" as valid re-authentication, so an IdP re-auth is a first-class
  equivalent of a password here, not a workaround.
- **A lost authenticator is recovery, not self-service, and two-factor can never be switched off.** With no
  current code there is no self-service path: a manager recreates the account (Q-1-06, TP1-10), matching
  OWASP MFA "Resetting MFA" (vouching by a trusted user / rigorous identity check). There is no "disable
  2FA" affordance; the only factor mutation an administrator can perform is the atomic replacement above, so
  an account is never left single-factor.
- **The replacement is reported in-app now; out-of-band email is deferred (Q-1-21).** The
  `auth.mfa_enrolled` / `auth.mfa_removed` audit events (migration 007) record every change. The OWASP-
  recommended out-of-band "your device changed" notification is built when SMTP lands, tracked with the
  other Q-1-21 items; until then the audit trail is the record.

Rejected alternatives:

- **Hand-rolled TOTP (own secret store, QR, and code comparison).** Reimplements security-critical crypto
  Supabase already provides correctly, adds attack surface and a second thing to keep right, and is easy to
  get subtly wrong. Rejected, consistent with ADR-0008.
- **Treating the `RequireMfa` route gate as the access boundary.** Would duplicate the RLS `is_aal2()` rule
  in a second place that can drift, and a single missed route would become a real data-exposure hole.
  Rejected: RLS stays authoritative; the route gate is UX only.
- **Requiring a password for every administrator (forcing Google-only accounts to set one).** Contradicts
  OWASP, which accepts a bound IdP/passkey credential as re-authentication; adds a password to protect on
  accounts that deliberately have none, enlarging attack surface for no gain. Rejected in favour of re-auth
  by account type.
- **Allowing self-service factor removal / "disable 2FA".** Directly violates NFR-S6 (two-factor is
  mandatory) and turns a hijacked session into a way to drop to single-factor. Rejected; replacement is
  atomic and a lost device is a manager-recreate.
- **Stamping a `has_factor` claim via the custom access-token hook (migration 006) and reading it in
  middleware instead of calling `getAuthenticatorAssuranceLevel()`.** Avoids a per-request assurance lookup
  but adds an auth-schema migration, and the claim goes stale between enrolment and the next token refresh
  (the window where the enrol-vs-verify distinction actually matters). Rejected for now; revisit only if the
  assurance lookup proves a measured hot-path cost.

## Consequences

Reusing Supabase's MFA means far less security-critical code to own, but it ties us to Supabase's TOTP
behaviour and its `getAuthenticatorAssuranceLevel()` semantics; the route gate asks for assurance level on
pre-`aal2` requests (the enrol/verify funnel), which piggybacks on the `getUser()` pass middleware already
makes — once a session is `aal2` the gate short-circuits on the local claim with no extra lookup. Because
the RLS gate is the real boundary, `RequireMfa` can be kept deliberately simple and is allowed to be
imperfect: a routing miss is a cosmetic bug, not a security hole. Device replacement being re-auth-gated
means a user who has lost their current code cannot self-serve and must wait for a manager recreate — this
is intended friction (it is exactly what stops a hijacked session from moving the factor), not a defect.
Out-of-band notification of a device change is absent until SMTP lands (Q-1-21), so during the domain-
blocked period the audit events are the only record of a replacement; this is the same honest deferral as
ADR-0008. The forced-enrolment gate makes `/mfa/enrol` reachable at `aal1`, so that screen and the verify
screen must themselves be safe to serve before a second factor exists (they expose no data; they only drive
the Supabase MFA calls). Finally, the end-to-end property (enrol, step-up, replace, and that a lost device
is not a bypass) is asserted by the E2E-11 test, which is gated on the full-stack harness (a TOTP secret and
a running Supabase stack) and runs off the credential-free CI path until that harness lands — so until then
it is unit- and component-tested, not proven end-to-end.
