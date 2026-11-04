# 0004. Phase 1 foundation: flat `src/`, npm/Node 20, and landing the proven database layer Phase-1-only

Date: 2026-11-04

## Status

Accepted

## Context

Ticket TP1-01 ("Protected records & audit trail") stands up the running app and the database that
protects every admin record, before any screens. It bundles plan tasks P1-00/01/02/03/04/05. Several
setup decisions had to be made, and two project documents disagreed on them:

- **App layout and toolchain.** The Phase 1 plan's generic working-agreement wording names a monorepo
  (`apps/web/`) on pnpm. The TP1-01 ticket instead specifies a **flat `src/`** app on **npm** and
  **Node 20**. The repo already uses npm, and its CI gates (`check:*`), ESLint ignores, `tsconfig`
  scope, and arch-gate globs are all written against top-level `src/**` and `supabase/**`, not
  `apps/web/**`. A monorepo layout would silently move app code outside every committed gate's scan
  path.
- **Where the Supabase client lives.** The plan's working agreement says `src/integrations/supabase`;
  the repo's own enforced rules (`decisions.md`, `AGENTS.md`, and the mechanical `arch-gate.config.json`
  rule "Exactly one Supabase client") say `src/lib/supabase`. Only one can be the enforced location.
- **The database layer.** Migrations 001-010, the RLS policies, the access-token hook and a pgTAP suite
  already exist, proven, in the `trackpoli-db-tests` harness, green on a plain-Postgres-16 stub. The
  harness also contains Phase 2/3 material (migrations 011+, tests 70-81), and two Phase 1 test files
  (`30_functions_and_grants`, and the seed helpers) were written against the *complete* schema, so they
  reference tables and functions that do not exist on a Phase-1-only database.
- **`data-map.json`** shipped with stale table names (`admin_users`, `audit_log`) that do not match the
  real schema (`profiles`, `activity_events`).

## Decision

Stand up the Phase 1 foundation as follows:

- **Flat `src/` Next.js (App Router, strict TypeScript) on npm and Node 20** (`.nvmrc` = 20). Keep the
  existing `src/components` and `src/services`; add `src/app`, `src/features`, `src/hooks`, `src/lib`,
  `src/lib/supabase`, `src/styles`. The app is served under `basePath: '/admin'`. This follows the
  ticket and keeps all committed gates pointed at the code they guard. The generic `apps/web`/pnpm
  wording is treated as superseded for TrackPoli.
- **The Supabase client lives only in `src/lib/supabase`**, the location the repo already enforces
  mechanically. The plan's `src/integrations/supabase` wording is treated as an inconsistency; no
  governance file changes. (No client is created in TP1-01; the folder and the ESLint/arch-gate rule
  are established now, clients arrive in P1-06.)
- **Land the database layer from the harness verbatim, Phase 1 only** (migrations 001-010, tests
  10-60, `seed.sql`, the sandbox stub). Phase 2/3 migrations and tests are left behind until their
  phases. This follows the repo rule "don't build for a future you don't have" (`decisions.md`).
- **Where a Phase 1 test file assumed Phase 2/3 objects, trim it to Phase 1 and park the removed
  assertions** verbatim in `supabase/tests/_phase2-3-parked/` for restoration in Phase 2/3, rather than
  deleting them or pulling the whole schema forward. (Test `30`'s two grant/function lists; the seed's
  Phase 2/3 helper functions.) No Phase 1 security assertion is weakened; `plan()` counts are intact.
- **Reconcile `data-map.json`** to the real columns, each with a lawful basis and retention;
  `sign_in_lockouts.email_hash` is recorded `not-personal` (a one-way hash).
- **Fix the stale generic `supabase/functions/AGENTS.md`** (it named a `user_roles` table TrackPoli does
  not use) to describe the real `_shared` helper layer this ticket lands.

Rejected alternatives: the `apps/web`/pnpm monorepo layout (moves code outside the gates; contradicts
the ticket); copying the entire harness including Phase 2/3 now (builds ahead of need, breaks the
one-phase-at-a-time rule, and the generic reviewer would flag it).

## Consequences

The Phase 1 foundation is scoped exactly to this phase and every committed gate sees the code it
guards. The app builds (`npm run build`) under `/admin`; `typecheck`, `lint` and the unit test pass
locally. The database layer is byte-identical to the proven harness, so the only risk surface is the
difference between the Postgres stub and real Supabase, which `supabase test db` in CI proves (the
`database` workflow) - this is the one part of TP1-01 that cannot be verified on a developer machine
without Docker/Supabase CLI, and it is deliberately delegated to CI.

Costs and honest limits: the parked Phase 2/3 assertions must be restored by hand when migrations 011+
and tests 70-81 land (tracked by the README in `supabase/tests/_phase2-3-parked/`); forgetting to
restore them would leave Phase 2/3 grants unproven, so Phase 2 must re-widen test `30` and the seed.
The generated `src/lib/database.types.ts` is a committed placeholder until `npm run gen:types` runs
against a real stack; CI fails on drift. `@types/node` is pinned to `^22` (not 20) because `vitest@5`
requires it; this is type-only and the runtime stays Node 20. The `src/integrations/supabase` vs
`src/lib/supabase` wording conflict is resolved in favour of the enforced location but remains a
documentation inconsistency in the upstream plan.
