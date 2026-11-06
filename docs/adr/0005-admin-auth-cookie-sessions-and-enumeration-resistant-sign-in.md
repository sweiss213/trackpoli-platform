# 0005. Admin authentication: server-set HttpOnly cookie sessions and enumeration-resistant sign-in

Date: 2026-11-04

## Status

Accepted

## Context

Ticket TP1-02 ("Reach the app and sign in securely") builds the first authentication surface: the
cookie-session infrastructure, the sign-in screen, Continue with Google, the per-account lockout
(Q-1-07) and Turnstile (Q-1-16). It covers plan tasks P1-01/P1-02/P1-06. Several security decisions
have to be fixed before code, because they shape every later auth-touching change (TP1-05/06 reuse the
session infrastructure):

- **Where the session token lives.** A token in `localStorage`/`sessionStorage` is readable by any
  script on the page, so an XSS turns into account takeover. Q-1-09 requires the browser never hold a
  token. The acceptance criterion forbids any token in web storage.
- **How many Supabase clients, and where.** `decisions.md`, the arch-gate "Exactly one Supabase client"
  rule, and the ESLint `no-restricted-imports` rule (established in TP1-01, see ADR-0004) pin every
  Supabase client to `src/lib/supabase`. The folder's README names three: `client.ts` (browser),
  `server.ts` (server, cookie session) and `admin.ts` (service role, server only).
- **Account enumeration and credential stuffing.** A sign-in that answers "unknown email" differently
  from "wrong password" — in wording or in timing — leaks which emails have accounts. Q-1-07 requires
  repeated wrong sign-ins to be slowed and hidden behind one generic message.
- **What the token is trusted for.** The database (ADR for TP1-01 / the RLS layer) decides access from
  the `profiles` table through security-definer helpers, never from a possibly-stale token claim.

## Decision

- **Sessions live in server-set `HttpOnly`, `Secure`, `SameSite=Lax` cookies**, written and refreshed by
  `@supabase/ssr` on the server. The browser never reads, writes, or stores a token; nothing is placed
  in `localStorage`/`sessionStorage`. Cookies are scoped to the `/admin` path (matching `basePath`), so
  they are never sent to any other app on the domain.
- **Three clients in `src/lib/supabase`, and nowhere else:**
  - `client.ts` — the browser (anon key) client, for client components only. It performs **no auth**;
    sign-in/out and all session reads happen on the server. It exists for later non-auth client reads.
  - `server.ts` — a per-request client bound to the request's cookies via `@supabase/ssr`
    `getAll`/`setAll`. This is the only client that reads or sets the session. A fresh instance per
    request (never a module-level singleton), because it closes over request-scoped cookies.
  - `admin.ts` — a `service_role` client, **server-only**, never imported from a client component. Used
    only by server routes/edge functions that must bypass RLS for an audited operation.
- **Each sign-in attempt runs in this fixed order:** (1) verify the Turnstile token; (2) call the
  `sign-in-check` edge function to read lockout state **before** any password is checked; (3) attempt
  the credential sign-in; (4) on failure write an `auth-event`, and on the fifth failure pause the
  account and write `auth.account_locked`. The lockout decision is made server-side from the database,
  not from anything the client sends.
- **Wrong password, unknown email, and a paused account return one identical generic message**, and the
  responses are equalized in time (a fixed minimum response duration) so they are indistinguishable
  within 100 ms. Google sign-in for an email with no admin profile is signed straight back out with the
  same generic message, and no account is created.
- **Token claims (`app_role`/`app_status`) are used for routing only.** Authorization decisions are made
  in the database from `profiles` via the security-definer helpers landed in TP1-01.

Rejected alternatives: a bearer token held in the browser and sent on each request (fails Q-1-09;
XSS-exfiltratable); distinct "no such user" vs "wrong password" messages or early returns (leaks
enumeration by content and by timing); a single shared Supabase client reused across requests (a
cookie-bound session cannot be a module singleton; mixing anon and service role in one client removes
the privilege boundary).

## Consequences

An XSS cannot read the session, because it is `HttpOnly`; the token never crosses into JavaScript. All
auth operations are server round-trips, which is the cost: there is no optimistic client-side session
state, and the deliberate minimum-duration floor adds latency to sign-in by design. The `admin.ts`
`service_role` client is a standing footgun — a single mis-import into client code would ship a
privileged key to the browser; this is contained by the `src/lib/supabase`-only import rule, the
server-only placement, and (in this ticket) an owasp lint plus a test. Honest limits: timing
equalization is best-effort — network jitter and cold starts can still vary the observed time, so the
"identical within 100 ms" guarantee is asserted by an e2e test (E2E-02), not proven absolutely; and the
Google redirect cannot be exercised end-to-end until a real domain exists (Q-1-21, domain-blocked), so
that path is unit-tested against the temporary URL and verified fully after the domain lands.
