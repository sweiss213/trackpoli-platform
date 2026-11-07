# TrackPoli — follow-up to-do list

Tracked follow-ups that are **not blockers** for merged work. Each is deferred on purpose, with the
reason it is not done yet and what it needs to be done.

## From TP1-02 (merged 2026-11-06, PR #10)

- [ ] **Apply the branch-protection ruleset.** Run `scripts/apply-ruleset.sh` so the committed ruleset
      (required status checks + 1 required approval) actually enforces on `main`. Until it is applied,
      GitHub does not require a review or the routing gate to merge. **Needs:** a repo admin to run it.

- [ ] **Wire up the full-stack E2E-02 test.** The `e2e (full stack · E2E-02)` CI job is currently
      skipped by design. **Needs:** the 2FA / dashboard tickets to exist first so the end-to-end
      sign-in path can be exercised.

- [ ] **Do a real deploy.** Stand the app up on real infrastructure (staging, then production).
      **Needs:** the service accounts (Supabase, Vercel, Cloudflare, Google OAuth, Cloudflare
      Turnstile, Sentry) and a domain to be in place.

## From TP1-03 (merged 2026-11-06, PR #11)

Unlike the items above, these two are **acceptance criteria for TP1-03** (Deliverable #1 and the
E2E-05 criterion), not optional follow-ups. The code shipped and was merged, but the ticket cannot be
marked closed until both are done. Both are **domain-blocked (Q-1-21)** — they need infrastructure to
be provisioned, not more code.

- [ ] **Set up the sending domain + SMTP and test real delivery.** Configure a sending domain
      (SPF/DKIM/DMARC) and Porkbun SMTP in Supabase Auth, then send a recovery email and confirm it
      lands in a real Gmail **and** a real Outlook inbox (not spam). This is the first feature that
      sends mail, so this provisioning belongs to TP1-03. **Needs:** a domain + the Supabase/Porkbun
      accounts (Q-1-21).

- [ ] **Make E2E-05 pass and promote it off the gate.** The full-stack recovery spec
      (`e2e/password-reset.full-stack.spec.ts`) is written but skipped — gated on `E2E_FULL_STACK`.
      Stand up the local full-stack harness (Supabase stack + Inbucket/Mailpit mail-catcher + the
      7-person seed + edge functions served + Turnstile TEST keys), get the spec green (the
      mail-catcher API path is the likely thing to adjust per CLI version), then enable the job on
      every PR. **Needs:** the harness above; depends on the SMTP/domain item for the real-delivery
      path.

## From TP1-04 (branch `feat/tp1-04-two-factor-protection`)

The two-factor code shipped on the branch, but these two are **acceptance / verification items for
TP1-04** that cannot be completed in code alone — both are **domain-blocked (Q-1-21, E2E-16)**: they need
the Supabase and Google OAuth stack to be provisioned, not more implementation.

- [ ] **Make E2E-11 pass and promote it off the gate.** The full-stack two-factor spec
      (`e2e/two-factor.full-stack.spec.ts`) is written but skipped — gated on `E2E_FULL_STACK`. Stand up
      the local full-stack harness (Supabase stack + the 7-person seed + edge functions served + Turnstile
      TEST keys), get the spec green (the TOTP replay timing between reuses is the likely thing to adjust
      on first run), then enable the `e2e (full stack · … E2E-11)` job on every PR. This is the ticket's
      acceptance criterion ("E2E-11 passes"). **Needs:** the harness above.

- [ ] **Verify the Google device-replacement re-authentication end-to-end.** The Google re-auth round-trip
      (`/auth/reauth/google` → `/auth/reauth/callback`, the identity-match and the HMAC marker) is built and
      unit-tested, but the live OAuth flow cannot be exercised until the Google account and domain exist —
      the same deferral as the Google **sign-in** path (E2E-16). Once the stack is up, run the replacement
      flow for a real Google-only administrator and confirm the "different Google account" and
      "sign-in not completed" branches behave. **Needs:** Google OAuth provisioning + a domain (Q-1-21).

- [ ] **Exercise the break-glass recovery runbook once infra exists.** `docs/runbooks/mfa-device-recovery.md`
      documents how a lost-device administrator is re-created (and the only-manager two-person path). The
      standard path is covered by the app; the break-glass path relies on operator-level Supabase access
      that only exists after provisioning. **Needs:** the Supabase project + accounts (Q-1-21); confirm the
      procedure end-to-end then.
