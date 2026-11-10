# 0010. Safe sessions: idle and absolute timeouts, a signed activity cookie, cross-tab sync, and scoped sign-out

Date: 2026-11-10

## Status

Accepted

## Context

Ticket TP1-05 ("Safe sessions") makes admin sessions expire predictably and revocable (plan task P1-09,
NFR-S5, Q-1-02). It builds on the TP1-02 cookie-session infrastructure (ADR-0005) and the two-factor gate
(ADR-0009). The policy is fixed by Q-1-02: a 5-minute access token, a 15-minute idle limit, and a 4-hour
absolute limit, with a warning two minutes before a limit. Several decisions have to be fixed before code,
because they shape an auth-touching surface that other tickets reuse:

- **Where the idle/absolute limits are enforced.** Supabase does not enforce an app idle or absolute limit on
  the free plan, so the application owns it. A client-only timer is trivially bypassed (disable scripting,
  replay a request), so enforcement has to be server-side, but the session token must never reach JavaScript
  (ADR-0005, Q-1-09), so the client cannot hold the clock in a readable value either.
- **What the warning looks like, and whether the absolute cap warns.** The design (Figma 1396:175539) shows
  two distinct dialogs: an idle warning that offers "Stay signed in" (activity resets it) and a 4-hour-cap
  warning that offers only "Sign in again" (an absolute cap cannot be extended). The absolute cap therefore
  gets its own advance warning, not a silent hard-expiry.
- **Sign-out scope.** Before this ticket the one sign-out route used Supabase's default scope (`global`),
  which revokes every device on every sign-out — so staying signed in elsewhere was impossible and a "sign
  out other sessions" control would be meaningless. OWASP Session Management asks logout to destroy *the*
  session and asks for a simultaneous-login policy, so normal sign-out and "sign out others" must be
  different scopes.
- **How session expiry is recorded.** OWASP Logging lists session-management events among the events to log
  through the shared handler; compliance-data-lifecycle reserves tamper-evident audit rows for sensitive-data
  access and privileged changes, which a timeout is not.

## Decision

- **Enforce the limits server-side from a signed, HttpOnly last-activity cookie** (`tp-activity`,
  `src/lib/sessionActivity.ts`). It carries the session start (absolute cap) and the last-activity timestamp
  (idle cap), HMAC-signed with the server-only `INTERNAL_CALL_SECRET` so the browser cannot forge or extend
  it. The edge middleware reads it, and on an over-idle or over-absolute session redirects a page navigation
  to `/session-expired` (or returns 401 to an API call), clearing the session cookies. Signing uses Web Crypto
  (`crypto.subtle`), which runs in both the edge middleware and node routes, unlike `node:crypto`. The cookie
  holds **no token** and is not the session; the Supabase HttpOnly cookie remains the session (ADR-0005).
- **The activity cookie is the only writer of the last-activity fact.** The browser never reads it; a once-a-
  minute `POST /admin/api/session/activity` (upper-bounded by `SESSION_ACTIVITY_PING_MS`) re-stamps it and
  returns the session start + server clock + limits to the client, which runs the countdown against them.
- **This enforcement is UX + defense-in-depth and fails open.** The RLS `is_aal2()` gate (ADR-0009) remains
  the authorization boundary; it denies every aal1 request regardless of routing. An absent or unreadable
  activity cookie (or a missing secret in local dev) leaves the timeout with no opinion and the request is
  allowed to the normal MFA/sign-in routing, so a reading gap never locks an administrator out.
- **Two warning dialogs, one component** (`SessionWarningDialog`): idle-warn is extendable ("Stay signed in"
  re-stamps and resets the countdown); absolute-warn is not ("Sign in again" / "Dismiss"; the cap still fires
  at the deadline). The phase decision is a pure function (`idleTimer.ts`) with the absolute cap winning ties.
- **Cross-tab coordination over a `BroadcastChannel('trackpoli-auth')` with a localStorage-event fallback**
  (`authChannel.ts`), chosen by feature detection, never user-agent sniffing. One tab's activity or "Stay
  signed in" resets the others; a sign-out in one tab signs out all.
- **Scoped sign-out.** Normal sign-out uses Supabase scope `local` (this session only) and sends
  `Clear-Site-Data: "cookies"`; a new `POST /admin/api/session/sign-out-others` uses scope `others` to revoke
  the administrator's other sessions while keeping this one. Password reset keeps ending all sessions
  (ADR-0008). `/session-expired` keeps the return path (`?next`), sanitised to an in-app `/admin` path so it
  can never be an open redirect.
- **A same-origin API `401` lands the client on `/session-expired`** (via a window event from `apiFetch`); a
  `403` does not, because it is an authorization denial (RLS/role), not an ended session.
- **Record expiry through the reporting spine** (`report()`), never the session token — not a tamper-evident
  audit row, which is reserved for sensitive-data access and privileged changes (compliance-data-lifecycle).
- **The limits are configuration, not code** (`src/lib/config.ts`, env-overridable with production defaults),
  so a deployment and the E2E-06 test can shorten them; the layout reads them server-side and passes them to
  the client, so nothing is `NEXT_PUBLIC` and there is one source of truth.

Rejected alternatives: a client-only idle timer (bypassable; no server enforcement); storing the last-activity
value in a readable cookie or web storage (an attacker edits it to stay alive, and it breaks the token-never-
in-JS rule); re-stamping activity in middleware on every navigation (idle would never fire); keeping sign-out
`global` (no simultaneous sessions, and "sign out others" becomes meaningless); mapping `403` to session-
expired (hides real authorization errors); a tamper-evident audit row for every timeout (heavier than the
event warrants, and reserved for sensitive-data access).

Scope note: this ticket builds the **bulk** "sign out other sessions" action. The design's per-device Active-
sessions list (enumerate each session with device + location + last-active and revoke individually) is a
follow-up — it needs a Supabase session registry, user-agent parsing, and IP geolocation that do not exist yet
(tracked in docs/TODO.md).

## Consequences

The idle and absolute limits are enforced server-side in the edge middleware from a signature the browser
cannot forge, so a forged cookie is never *accepted* to extend a session, and the session token never enters
JavaScript. But enforcement is deliberately **fail-open**, and that is the honest boundary of the control: a
deleted or corrupted `tp-activity` cookie reads as *absent*, and a missing reading allows the request (the
countdown then rests on the client and, ultimately, the Supabase refresh-token lifetime). So the timeout is
**best-effort** — bypassable by deleting the cookie at an already-authenticated workstation — not an
unforgeable guarantee, and **RLS does not backstop it**, because RLS enforces authorization (aal2), not
session age. This is a conscious availability-over-strictness choice: a reading gap must never lock an
administrator out. Closing it fully (fail-closed after a grace period) needs a server-side session registry so
"authenticated but no activity cookie" can be told apart from a legitimate first request — deferred with the
per-device list (see the scope note and docs/TODO.md); the fail-open posture is covered by a @security
scenario so it is tested and owned, not incidental. The cost otherwise: a once-a-minute ping per active tab.

Further honest limits: the client runs the countdown against the server-provided session start but its own
interaction clock, so a large client/server clock skew can shift the absolute warning's timing (the server
still enforces the real deadline); the once-a-minute stamp means middleware can see activity up to a minute
stale, which errs toward expiring slightly early, never late; and the 15-minute idle sits at the lenient end
of OWASP's high-value-app guidance (2–5 min) — a conscious Q-1-02 product trade-off, partly offset by the
5-minute access token. The logout endpoints rely on `SameSite` (lax for the session cookie, strict for the
activity cookie) rather than a CSRF token, so a cross-site forged logout is blocked by the browser, not by an
app token (consistent with the app's SameSite + Cloudflare WAF posture; `sign-out-others` is the more
privileged of the two). Two minor client-side gaps are disclosed, not silent: an expiry detected via an API
`401` (rather than a navigation) shows the idle copy on `/session-expired`, because the 401 event does not
carry the cause; and when one tab expires it lands on `/session-expired` while its sibling tabs follow the
sign-out broadcast to the sign-in screen. The acceptance E2E runs (E2E-06 idle→expired, E2E-07 cross-tab
sign-out) need the full-stack harness with shortened `SESSION_*` limits in their own job and are gated until
it exists (docs/TODO.md).
