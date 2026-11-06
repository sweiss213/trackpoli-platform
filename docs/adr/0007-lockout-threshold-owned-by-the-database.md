# 0007. The sign-in lockout threshold is owned by the database

Date: 2026-11-05

## Status

Accepted

## Context

TP1-02 added the per-account sign-in lockout flow. Migration 010 owns the rule: `record_sign_in_failure`
pauses sign-in after **5** failures in a 15-minute window. The sign-in screen also shows the admin how many
attempts remain before a pause ("N attempts remaining"), so the `auth-event` edge function has to produce
that count. In the first implementation it did so by keeping its own constant, `LOCK_THRESHOLD = 5`, and
subtracting the `sign_in_lockouts.failures` it read back — a second copy of a number the database already
owns, with a comment admitting it was "kept in step with migration 010".

The architecture review (judge-arch, `docs/arch-reviews/log.jsonl`, 2026-11-05) flagged this as a
data-ownership violation: the threshold is a security knob, and if it were ever tuned in the migration the
database would enforce the new value while the UI counted down to the old one — the exact "kept in sync"
duplicated-fact smell `decisions.md` forbids.

## Decision

Make the database the single owner of the threshold and of the derived count.

- Migration 011 adds `sign_in_lock_threshold()` — the one place the number `5` lives — and
  `record_sign_in_failure` now reads `>= public.sign_in_lock_threshold()` instead of a literal.
- A new read-only `sign_in_attempts_remaining(p_hash)` computes the remaining count **in the database**
  from its own threshold and counter, returning the full threshold when no row exists yet.
- `auth-event` drops `LOCK_THRESHOLD` and the follow-up `failures` read and calls
  `sign_in_attempts_remaining`. The server holds no copy of the threshold.

The change is **expand-only**: `record_sign_in_failure` keeps its name, arguments and `timestamptz` return
type (so `CREATE OR REPLACE` is legal and migration 010's lockout tests and the generated types are
unaffected), and no object is dropped. The new functions are service-role only, with the implicit `PUBLIC`
execute grant revoked, matching the other lockout functions.

The count still depends only on the hash counter and is identical for any email, so surfacing it does not
reveal whether an account exists (ADR-0005).

Rejected alternatives:

- **Leave `LOCK_THRESHOLD` in the edge function** — rejected: it is the duplicated fact the review flagged.
- **Pass the threshold from the app into `record_sign_in_failure`** — rejected: it inverts ownership,
  letting the app define a security threshold the database must enforce.
- **Drop the "attempts remaining" affordance** — rejected: it is a specified, tested part of the sign-in
  contract; the fix should remove the duplication, not the feature.

## Consequences

- The threshold can be tuned in exactly one place (`sign_in_lock_threshold()`); the enforced value and the
  displayed count can never drift.
- One extra function call replaces the extra table read in `auth-event` — the same single round trip, no
  new cost.
- The pgTAP lockout suite (`50_lockout.test.sql`) and the grants suite (`30_functions_and_grants.test.sql`)
  cover the new functions' behaviour and service-role-only grants. These run in the database CI job
  (local Supabase), not in the unit/gate suite.
