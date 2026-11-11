# 0015. Staging deploy self-skips until configured (fail-closed-but-inert)

Date: 2026-11-10

## Status

Accepted

## Context

`deploy-staging.yml` runs on every push to `main`. Its header says it is "inert until configured," but it was
not: with no `STAGING_SUPABASE_PROJECT_REF` variable (and no staging secrets) set, its first step still ran —
`supabase db push --project-ref ""` — and failed with "cannot be empty." So the `staging` GitHub environment
showed a red X on every merge, even though the team runs **production only** and has deliberately not set up a
staging environment yet. A deploy pipeline for an environment that does not exist should not report failure; a
red check that is expected-and-ignored trains people to ignore red checks.

The team's decision stands: production only, no staging for now. We want to keep the workflow file so staging
can be turned on later by setting the secrets and the variable — without rewriting the pipeline — but it must
be genuinely inert until then.

## Decision

Guard the whole `deploy` job with `if: ${{ vars.STAGING_SUPABASE_PROJECT_REF != '' }}`. When the variable is
absent/empty the job is **skipped** (neutral), so no step runs, no deploy is attempted, and the `staging`
environment is not touched — the workflow stays green. When the variable is set, the job runs exactly as
before. This is fail-closed-but-inert: an unconfigured deploy pipeline does nothing rather than erroring
(release-deployment-safety — an unconfigured pipeline must not emit a false failure signal, and must never
half-deploy).

`vars` is readable in a job-level `if`, and `deploy-staging` is **not** a branch-protection required check
(`main` is unprotected), so a skipped job blocks no merge. The header comment now documents the self-skip.

### Options considered

1. **Delete the workflow.** Rejected: staging is deferred, not abandoned; keeping the file (inert) means
   enabling staging later is just setting secrets + the variable, not reconstructing the pipeline.
2. **Leave it; treat the red X as known-noise.** Rejected: a permanently-red "expected" check erodes the
   signal — people stop reading the checks, and a real failure hides in the noise.
3. **Per-step guards (`if:` on each step).** Rejected: more surface, and the job/environment would still be
   entered; a single job-level guard skips the whole thing cleanly.
4. **Job-level `if` guard on `STAGING_SUPABASE_PROJECT_REF` (chosen).** One line, keeps the file, skips
   neutral, and self-enables when configured.

## Consequences

- **The `staging` environment stops going red** on `main` pushes while staging is unconfigured; the job shows
  as skipped (neutral), not failed.
- **Staging is one setting away.** Setting `STAGING_SUPABASE_PROJECT_REF` (plus the secrets) makes the job run
  on the next push with no workflow edit.
- **Guarded on the right signal, and it is the only workable one.** The guard keys on
  `STAGING_SUPABASE_PROJECT_REF` because a job-level `if` can read the `vars` context but **not** the `secrets`
  context (GitHub Actions context-availability: `github`, `needs`, `vars`, `inputs` only) — a guard on a
  secret could never enable the job. If the variable is set but a required secret is missing, the job runs and
  fails as before; that is acceptable (a half-configured staging *should* surface loudly), and a false-green
  would be worse.
- **The "skip blocks nothing" guarantee is contingent on `main` staying unprotected.** GitHub does not treat a
  *skipped* required check as satisfied. So if `deploy-staging` is ever added to branch protection as a
  required check **while staging is still unconfigured**, the skip would block merges. If branch protection is
  introduced later, exclude `deploy-staging` from the required checks until staging is configured (or switch
  this job to an early `exit 0` guard step so it reports success instead of skipping).
- **Reversible.** If staging is set up, nothing about the pipeline changed; if the guard is ever unwanted,
  removing the one `if:` line restores the prior behaviour.
