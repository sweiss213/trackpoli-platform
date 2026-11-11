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

## From TP1-05 (branch `feat/tp1-05-safe-sessions`)

The safe-sessions code shipped, but these are **acceptance / verification / scope items** that cannot be
finished in this ticket's code.

- [ ] **Make E2E-06 and E2E-07 pass and promote them off the gate.** The full-stack spec
      (`e2e/safe-sessions.full-stack.spec.ts`) is written but skipped — gated on `E2E_FULL_STACK`. It needs a
      **dedicated** full-stack CI job with the limits shortened via env
      (`SESSION_IDLE_MS`, `SESSION_WARN_LEAD_MS`, `SESSION_ACTIVITY_PING_MS`) — it cannot share the existing
      `e2e (full stack · E2E-02, E2E-05, E2E-11)` job, because shortening the session limits there would
      expire those other specs mid-run. Stand up the harness, add the job, get the spec green (the idle
      warning timing is the likely thing to adjust first), then enable it on every PR. This is the ticket's
      acceptance criterion ("E2E-06 and E2E-07 pass"). **Needs:** the full-stack harness + the new job.

- [ ] **Set the Supabase access-token (JWT) lifetime to 5 minutes.** Q-1-02 specifies a 5-minute access
      token; that is a Supabase project Auth setting, not application code (`config.ts` records it for the
      client's reasoning only). **Needs:** the Supabase project to exist (Q-1-21); set it in Auth settings.

- [ ] **Build the per-device Active sessions list.** TP1-05 shipped the **bulk** "Sign out other sessions"
      action only. The design (Figma 1396:175539) also shows a per-device list — each session with device,
      location and last-active, individually revocable. That needs a session registry (enumerate
      `auth.sessions` via the admin client), user-agent parsing ("Chrome on Mac"), IP geolocation ("Lagos",
      from Cloudflare), and per-session revoke — none of which exists yet, and it is partly domain-blocked
      (needs the Supabase + Cloudflare stack to test). **Needs:** its own ticket + the stack (Q-1-21).

- [ ] **Make the idle/absolute timeout fail-closed after a grace period (harden the fail-open).** Today a
      deleted/corrupted `tp-activity` cookie reads as absent and the middleware fails open (allows the
      request), so the timeout is bypassable by deleting the cookie at an already-authenticated workstation
      (judge-arch MED-1; documented in ADR-0010 and covered by a @security fail-open scenario). To close it,
      stamp `tp-activity` at sign-in / MFA-completion so "authenticated + aal2 + no activity cookie" can be
      told apart from a legitimate first request, then fail *closed* after a short grace. **Needs:** the
      server-side session registry (same dependency as the per-device list) to distinguish the two states
      safely without risking a lockout.

- [ ] **Confirm the idle/absolute limits behave with a real Cloudflare + Vercel edge.** The middleware
      enforcement and cookie clearing are unit/e2e-tested against the dev server; verify the signed activity
      cookie, the `Clear-Site-Data` header, and the `/session-expired` redirect behave once the app sits
      behind Cloudflare → Vercel with the `/admin/*` never-cache rule (docs/cloudflare-spike.md). **Needs:**
      the Cloudflare + Vercel deploy (Q-1-21).

## From TP1-06 (branch `feat/tp1-06-role-based-access`)

The role-based-access code shipped, but these are **acceptance / verification / scope items** that cannot be
finished in this ticket's code.

- [ ] **Make E2E-08 pass and promote it off the gate.** The full-stack spec
      (`e2e/role-based-access.full-stack.spec.ts`) is written but skipped — gated on `E2E_FULL_STACK`. Stand
      up the harness (Supabase stack with the access-token hook enabled + the 7-person seed + Turnstile TEST
      keys), sign in as a plain Administrator, and confirm `/admins` shows the forbidden screen and
      `/admin/api/admins` returns 403. This is the ticket's acceptance criterion ("E2E-08 passes"). **Needs:**
      the full-stack harness.

- [ ] **Live-verify the authenticated shell (visual + keyboard).** The app shell, side navigation, forbidden
      and not-found screens were built from the exact Figma design context but cannot render without a
      session, so they have not been seen running. Once the stack is up, check the shell against the designs
      and run a keyboard + screen-reader pass (part of the P1-16 a11y audit). **Needs:** the full-stack stack.

- [ ] **Surface the profile `display_name` in the shell.** The side nav and top bar currently show the
      administrator's email as the display name; the real name lives in `profiles.display_name`. Read it
      (own-row RLS allows it) and pass it to the shell. **Needs:** a small session/profile read; no infra.

- [ ] **Wire the "Request access" action on the forbidden screen.** It currently links to Settings as a
      placeholder. Decide and build the real request-access flow (e.g. notify an Administrator manager).
      **Needs:** its own small ticket.

- [ ] **Finish the RequireTerms guard when the terms screen lands.** The guard slot is inert (option A); the
      restrictive RLS enforces terms at the data layer meanwhile. When the terms-acceptance screen + API are
      built, wire RequireTerms to redirect an un-accepted session there and surface acceptance to the client.
      **Needs:** the terms/onboarding ticket.

- [ ] **Handle the `invited` (onboarding) and `deactivated` states properly.** TP1-06 redirects a deactivated
      session to sign-in and lets an invited one through; the real onboarding/invite flow and a deactivated
      screen are their own ticket. **Needs:** the invite/onboarding ticket.

## From TP1-07 (branch `feat/tp1-07-admin-workspace-shell`)

The shell + shared component library shipped and is verified headlessly (E2E-13 keyboard, E2E-14 axe with
0 serious/critical, Lighthouse LCP 912ms). These are **verification / CI-wiring items** that cannot be
finished in this ticket's code.

- [ ] **Wire the NFR-P1 Lighthouse check into CI.** `scripts/check-lighthouse.mjs` + `lighthouse.config.json`
      exist and pass locally (LCP 912ms, TBT 16ms, perf 0.98 against the shell demo, budget LCP <= 2500ms),
      but like the axe scaffold it needs a running app + Chrome, so it is not in the dependency-free CI yet.
      Add a CI job that builds + starts with `NEXT_PUBLIC_ENABLE_GALLERY=1` and runs `npm run check:lighthouse`.
      **Needs:** a browser-capable CI job. Re-point it at real admin screens as they land.

- [ ] **Live-verify the authenticated shell (real session).** E2E-13/E2E-14 run against the credential-free
      gallery + shell demo (mock `AuthProvider`); the real `(app)` shell behind a session has not been seen
      running. Once the full-stack harness is up, run the keyboard + axe passes against the authenticated
      shell and check it against the Figma frames. **Needs:** the full-stack stack (shared with TP1-06).

- [ ] **Human keyboard + screen-reader a11y audit (NFR-A1).** The conformance record's pass-manual verdicts are
      agent static reviews plus the automated axe scan; the full human assistive-tech audit of the rendered
      shell is scheduled for P1-16. **Needs:** the P1-16 audit.

- [x] **Add dedicated keyboard-event unit tests for the remaining interactive primitives.** Done:
      `otp-field.test.tsx` and `NavItem.test.tsx` now assert each is a native, focusable control kept in the
      tab order (reachable and operable by keyboard), for parity with the dialog/form/snackbar tests.
