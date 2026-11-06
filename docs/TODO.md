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
