# 0013. Disable Next.js Cache Components (prerender) until the P1-12 app shell adopts it with Suspense

Date: 2026-11-10

## Status

Accepted

## Context

The Phase-1 foundation (TP1-01) enabled Next.js 16 **Cache Components** in `next.config.ts`
(`cacheComponents: true`, `partialPrefetching: true`) as part of the initial scaffolding, with no
recorded rationale. Cache Components (the successor to Partial Prerendering) requires every access to
request-time data — `cookies()`, `headers()`, `fetch()` of uncached data — to sit inside a `<Suspense>`
boundary or be explicitly cached, so the static shell of a route can be prerendered while the dynamic
part streams.

TrackPoli's root `src/app/layout.tsx` is an `async` Server Component that does `await getSessionUser()`
at the top level (which reads the session cookie through the Supabase SSR client) so it can hand the
server-resolved user to `AuthProvider` and `SessionGuard` on every route. That top-level dynamic access,
outside any `<Suspense>`, makes **every** route un-prerenderable — including the framework's
auto-generated `/_not-found` route, which has no component the app can wrap in Suspense.

When the project was connected to Vercel, the production build failed:

```
Error: Route "/_not-found": Next.js encountered uncached or runtime data during prerendering.
Export encountered an error on /_not-found/page: /_not-found, exiting the build.
```

The failure is specific to Vercel's build adapter ("Applying modifyConfig from Vercel"): a local
`next build` (both the default and `--turbopack`) prerenders `/_not-found` as static and exits 0, so the
issue could not be reproduced or a fix verified locally. The repository's own CI `check (bundle-size)`
job (which runs `next build`) is also green. Only Vercel's build enforces the strict Cache Components
prerender validation that rejects the dynamic root layout.

## Decision

Turn Cache Components **off** by removing `cacheComponents: true` and `partialPrefetching: true` from
`next.config.ts`, leaving `basePath: "/admin"`. The app reverts to standard per-request server rendering,
where a dynamic root layout is normal and `/_not-found` renders on demand.

### Options considered

1. **Disable Cache Components (chosen).** A one-line config change that does not touch the auth/session
   path. The admin app is invitation-only, auth-gated, and renders per-user content on every route, so
   partial prerendering of a static shell buys very little today. Cost: we forgo PPR streaming until the
   app is structured for it.
2. **Keep Cache Components and wrap the session access in `<Suspense>`.** The "proper" adoption: move
   `await getSessionUser()` into a Suspense-wrapped child so the static shell (and `/_not-found`)
   prerenders while the authed shell streams. Rejected for now: it restructures the load-bearing root
   auth path, every other route that reads cookies would need the same treatment, and — because the
   failure does not reproduce locally — the fix could not be verified before shipping. This is the right
   shape for the P1-12 app shell (which adds real loading/empty/error/not-found states), not a hotfix.
3. **Leave it failing / mark the deploy non-blocking.** Rejected: it leaves the production deploy red and
   normalises a broken build.

## Consequences

- The Vercel build no longer fails on `/_not-found` prerendering; the admin app deploys with standard
  SSR. No change to authentication, routing, or any screen's behaviour — only the rendering strategy.
- We lose Partial Prerendering / Cache Components streaming until it is adopted deliberately. That
  adoption belongs with the **P1-12 app shell**, which introduces the loading/empty/error/not-found
  states and the Suspense boundaries that Cache Components needs; this ADR is superseded then.
- **Honest limit (verification):** the original failure reproduces only on Vercel's build, not locally,
  so this fix is verified by the Vercel deployment after merge, not by a local build (which already
  passed). If a Vercel preview still fails after this change, the cause is elsewhere and this ADR is
  revisited.
