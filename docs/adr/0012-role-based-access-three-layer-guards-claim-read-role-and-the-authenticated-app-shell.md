# 0012. Role-based access: three-layer guards, claim-read role, and the authenticated app shell

Date: 2026-11-10

## Status

Accepted

## Context

Ticket TP1-06 ("Role-based access") makes an administrator see only what their role allows, and keeps
manager-only routes and data closed to Administrators even if they type the URL or call the API directly
(plan task P1-11). It builds on TP1-01 (the `admin_role`/`admin_status` enums, the `profiles` helpers
`is_manager()`/`current_admin_role()`, the manager-only RLS of migrations 005/009, and the access-token hook
of migration 006 that injects `app_role`/`app_status` into the JWT) and on TP1-02/05 (cookie sessions,
middleware). Several decisions have to be fixed before code:

- **The role claims exist but were never read.** The hook stamps `app_role`/`app_status` on every token and is
  enabled in `config.toml`, but `getSessionUser` returned `role: null, status: null` — nothing surfaced the
  claims. The whole ticket rests on reading them.
- **What the guards are trusted for.** The ticket describes two layers (middleware early redirect + nested
  wrappers) that "read role from the token claims"; it also says "the landed RLS is what actually protects
  data." So the guards are routing/rendering, not the authorization boundary — mirroring RequireMfa (ADR-0009).
- **Where the error screens live.** The forbidden and not-found designs render *inside* the full app shell
  (sidebar + top bar), so the ticket's "route layouts" deliverable implies building the authenticated shell.
- **Scope.** The nav links to a dashboard, record screens and admin-management actions that are each their own
  ticket; TP1-06 is the access layer, not those features.

## Decision

- **Read `app_role`/`app_status` from the verified access-token claims** (`getClaims()`), normalised to the
  `AdminRole`/`AdminStatus` vocabulary in `src/lib/roles.ts`, and surface them through `getSessionUser` →
  `AuthProvider` and through `updateSession` to the middleware. This is **routing/rendering only, never
  authorization**: a read that is missing or wrong is a cosmetic routing bug, because RLS decides access.
- **Three enforcement layers, with RLS as the only boundary:**
  1. **Middleware early redirect** (`decideRoleGate`, pure + tested): an Administrator who reaches a
     manager-only path (`/admins`) is redirected to `/forbidden?from=…`, keeping the attempted path for the
     screen's breadcrumb and copy. Runs after the sign-in and MFA gates.
  2. **Nested guard wrappers** reading **only** from `AuthProvider` (`PublicOnly`, `RequireSession`,
     `RequireActive`, `RequireRole`), plus the `(app)` server layout (session + active) and the manager route's
     own server role check. These are UX/defense-in-depth; a wrapper the client briefly skips is never an
     exposure.
  3. **The manager API returns 403** (role check) and **RLS returns no manager rows** to a non-manager
     (`profiles_select_manager` etc.), regardless of routing. The API never touches the database directly — it
     calls the `listAdmins` service (decisions.md layering).
- **The guard DECISIONS are pure functions** (`guards/decisions.ts`, `guards/routeGate.ts`), unit-tested across
  every status × role, so "every guard × status × role" is covered without rendering.
- **Unknown role fails CLOSED on a manager route** (never render manager UI to an unconfirmed role) and
  **fails OPEN elsewhere** (a missing status/role read allows a normal route; RLS still protects the data), so
  a transient claims-read failure degrades to a forbidden screen for a manager, never a data leak, and never a
  lockout from ordinary pages.
- **Build the authenticated app shell** (`src/features/shell/*`): a role-gated side navigation (the manager-only
  "Admin management" entry is hidden for an Administrator — a convenience, never the boundary), a top bar with a
  breadcrumb and user chip, and the forbidden (403) + not-found (404) screens rendered inside it. Routes move
  under an `(app)` route group whose layout applies the session/active guards. The richer shell (snackbar/dialog
  hosts, loading/empty states, focus management, the collapse affordance's persistence) stays with P1-12.
- **`RequireTerms` is an inert slot (option A):** the terms-acceptance screen is a later ticket, and restrictive
  RLS (migration 009) already blocks the data until acceptance; the pure decision exists but is not wired into a
  live redirect yet. **`RequireMfa` is not a client wrapper:** MFA is enforced by the middleware aal gate
  (ADR-0009), because `AuthProvider` carries `{ authenticated, role, status }`, not aal or terms acceptance.
- **Scope:** TP1-06 ships the guard system, the shell, the error screens, and a guarded manager route + API
  (E2E-08). The dashboard content, the record screens, and the admin-management actions (invite/roles/deactivate)
  are deferred to their own tickets; their routes exist as guarded placeholders.

Rejected alternatives: trusting the role claim for authorization (a stale/forged claim must never grant access —
RLS reads `profiles` live); building `RequireMfa`/`RequireTerms` as client wrappers (they cannot read aal/terms
from `AuthProvider`, and client gating is weaker than the server/RLS layers that already enforce them); hiding
the manager nav as the access control (an Administrator can still type the URL — so the middleware redirect, the
API 403 and RLS are the real gate); redirecting to a dedicated `/forbidden` without the attempted path (loses the
breadcrumb/copy context the design shows).

## Consequences

An Administrator who types `/admins` or calls `/admin/api/admins` gets the forbidden screen and a 403, and the
manager tables return no rows to them even if a routing layer were bypassed, because RLS is the boundary. The
role claim never grants access — it only routes. The cost: a `getClaims()` read per request that needs a role
opinion (best-effort, fail-open on ordinary routes); a conscious fail-closed stance on manager routes (a
transient read failure shows a manager the forbidden screen rather than leaking manager UI); and the honest
limit that hiding the manager nav is cosmetic. Honest limits: the authenticated shell cannot render without a
session, so its live visual/keyboard verification is pending the full-stack stack (built from the exact Figma
design context meanwhile); the display name shown in the shell is the administrator's email until the profile
`display_name` is surfaced (a small follow-up); the "Request access" action on the forbidden screen links to
Settings as a placeholder until a request-access flow exists; and the acceptance run E2E-08 needs the full-stack
harness and is gated until it exists (docs/TODO.md).
