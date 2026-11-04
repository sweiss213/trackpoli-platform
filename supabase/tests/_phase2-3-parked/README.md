# Parked Phase 2 / Phase 3 test material (do NOT wire into CI yet)

TrackPoli ships one phase at a time (see the build plan and `decisions.md`: "don't build for a
future you don't have"). The database-test harness in `trackpoli-db-tests` was written against the
**complete** schema (migrations 001–020). Ticket **TP1‑01** lands **Phase 1 only** (migrations
001–010, tests `10…60`).

Two pieces of the Phase 1 test files assumed Phase 2/3 objects that do not exist yet on a
Phase‑1‑only database. Rather than delete them, they are **parked here verbatim** and must be merged
back when the owning migrations land:

| Parked file | Restore when | Goes back into |
| --- | --- | --- |
| `30_grants.phase2-3-additions.sql.txt` | Phase 2 record framework (011–013) and Phase 3 tables (016–020) land | the two `set_eq` expected lists in `../database/30_functions_and_grants.test.sql` |
| `seed-helpers.phase2-3.sql.txt` | the Phase 2/3 tests (`70…81`) land | the helper section at the end of `../../seed.sql` |

Files here use a `.sql.txt` extension on purpose, so `supabase test db` / `pg_prove` never run
them. Nothing in this folder is active. See ADR `docs/adr/0004-*` for the decision.
