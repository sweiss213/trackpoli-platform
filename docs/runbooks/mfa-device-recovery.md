# Runbook: recovering an administrator who lost their two-factor device

**Applies to:** TrackPoli Admin · two-factor (TOTP) is mandatory for every administrator (NFR-S6, Q-1-01,
ADR-0009). There is no self-service way to remove or reset a factor. An administrator who still has their
current device replaces it themselves in **Settings → Security → Replace device**. This runbook is only for
the case where the current device is **lost, broken, or reset** and self-service is impossible.

## Principle

A lost factor is an **account re-creation**, not a factor reset (OWASP MFA "Resetting MFA" — recovery must
not become a bypass). The account is re-created with the **same email, name, and role**; the person receives
a fresh invite and enrols a new authenticator. History stays readable because audit and activity are keyed
to the identity, not the auth factor.

## Who performs it

- **A normal administrator** who lost their device: **another Admin manager** re-creates the account from the
  app (Admin management). One manager is sufficient; follow "Standard recovery" below.
- **An Admin manager** who lost their device: **another Admin manager** re-creates it, same as above.
- **The only Admin manager** lost their device: the account **cannot be re-created from the app** (no one
  else can perform the privileged action). Follow "Break-glass recovery (two people present)" below.

## Before you start (identity check)

Re-creation hands someone a working administrator account, so verify the requester **out of band** before
doing anything:

1. Confirm the request came from the real person through a second channel (a known phone number or a
   video call — not only email or chat).
2. Confirm the email, name, and role to re-create. Do not change the role during recovery.
3. Record who requested it, who verified it, and when.

## Standard recovery (another Admin manager available)

1. In **Admin management**, open the affected administrator and confirm the identity details.
2. Re-create the account with the **same email, name, and role**. (Re-creation issues a new invite and a new
   auth identity; the old factor is discarded.)
3. The system sends a new invite to the same email.
4. The administrator accepts the invite, signs in, and is forced through **two-factor enrolment** before they
   can reach any data (the normal `/mfa/enrol` gate).
5. Confirm in the **audit log** that the re-creation and the new enrolment were recorded.

## Break-glass recovery (the only Admin manager, two people present)

Because no second manager exists to perform the privileged action, this path needs **two trusted people
physically present together** (four-eyes), and it touches infrastructure, so treat it as a change:

1. Two authorised people convene (for example the only manager plus the system owner). Neither acts alone.
2. Re-verify identity out of band as above, with both present.
3. Using the operator-level access to Supabase (service role / dashboard — **not** the app UI), re-create or
   re-invite the administrator with the same email, name, and role, following the same expand-and-contract
   care as any production change. Do **not** disable the two-factor requirement to "make it easier."
4. The administrator accepts the new invite and is forced through two-factor enrolment on first sign-in.
5. Write a short record: who was present, what was done, when, and why. File it with the audit trail.

## Do not

- Do **not** add a "disable two-factor" switch, a backup-code bypass, or any self-service factor removal —
  these re-open the exact hole mandatory MFA closes (ADR-0009).
- Do **not** re-create an account on an unverified request.
- Do **not** change the person's role during recovery.

## Honest limits

This runbook is a human procedure; it is not enforced by a gate. The app-side controls it relies on
(Admin management re-creation, the forced-enrolment gate, the audit events) are covered by TP1-04 and its
tests. The break-glass path depends on operator access that exists only once the Supabase project and the
accounts are provisioned (Q-1-21, domain-blocked); until then it is documented, not exercised.
