# 0014. basePath-relative navigation: no literal `/admin` in Next-aware nav APIs

Date: 2026-11-10

## Status

Accepted

## Context

The admin app is served under `basePath: "/admin"` (next.config.ts, P1-01). Next.js prepends that
basePath **automatically** to its own navigation APIs, and the codebase was *also* hardcoding `/admin`
on top of it, producing `/admin/admin/...` — a 404 on every affected navigation. This was observed on a
Vercel production click-through: a signed-out visitor hitting a guarded route was redirected to
`/admin/admin/sign-in` and got a 404, making the deployed app unreachable.

The root cause is that two classes of navigation API behave differently, and the difference is invisible
at the call site:

- **Next-aware APIs add basePath for you.** Verified against the installed Next **16.4.5** source:
  - `<Link href>` and `useRouter().push/replace` apply `addBasePath` in the client router.
  - `redirect()` from `next/navigation` applies basePath on **both** paths: server/hard navigation sets
    `location` via `addPathPrefix(getURLFromRedirectError(err), basePath)`
    (`next/dist/server/app-render/app-render.js:2515` and `:5290`), and client/soft navigation is caught
    by the `RedirectBoundary`, which calls `router.push/replace(redirect)`
    (`next/dist/client/components/redirect-boundary.js`) → `addBasePath`.
  So a literal `/admin` passed to any of these is doubled.
- **Raw APIs do NOT add basePath.** `window.location.assign(...)`, a plain `<a href>`, `apiFetch(...)`
  (raw fetch), middleware and route-handler `NextResponse.redirect(new URL("/admin/...", request.url))`
  (an absolute URL built from `request.url`), cookie `path: "/admin"` (cookie scope, matches basePath),
  and Supabase OAuth `redirectTo: ${origin}/admin/...` (absolute URL) all need the `/admin` kept.

## Decision

**Call sites classify by API, not by blanket rule.**

- In a **Next-aware** nav API (`<Link href>`, `useRouter().push/replace`, `next/navigation` `redirect()`),
  write the path **basePath-relative** — never a literal `/admin` prefix. Next adds it.
- In a **raw** API (`window.location`, plain `<a href>`, `apiFetch`, `new URL(..., request.url)` in
  middleware/route handlers, cookie `path`, absolute OAuth `redirectTo`), **keep** the `/admin` prefix.
- Path **normalization** that strips the basePath off the live `window.location.pathname`
  (`pathname.startsWith("/admin")`, `.slice("/admin".length)`) is unaffected and keeps `/admin` — it
  reads the real runtime path, which does include the basePath.

This is enforced mechanically: arch-gate rule **"No literal /admin in Next-aware navigation (basePath is
added automatically)"** forbids `/admin` immediately after a `<Link href`, a `router.push/replace(`, or a
bare `next/navigation` `redirect(` quote in `src/**/*.{ts,tsx}` — a negative lookbehind `(?<![.\w])` on the
`redirect(` pattern excludes `NextResponse.redirect(...)`, which is a raw API that keeps `/admin`.
Detection is proven by a planted-violation test (a reintroduced literal makes the gate exit non-zero);
`check:discriminate` separately confirms the gate's mechanical detection floor is non-vacuous. `arch-encode`
recorded the negative example in `decisions.md`.

### Options considered

1. **Keep `/admin` literals everywhere and disable basePath.** Rejected: basePath is the P1-01 requirement
   (every page/asset/API under `/admin`), and raw APIs genuinely need the prefix — dropping basePath just
   moves the inconsistency and breaks asset/API routing.
2. **Convention only (code review + ADR), no gate.** Rejected: this exact regression already shipped to
   production once; a convention a reviewer can miss is not enough for a correctness bug that makes the app
   unreachable.
3. **basePath-relative in Next-aware APIs, `/admin` in raw APIs, enforced by the arch-gate + a
   discriminating test (chosen).** The call-site classification matches how Next actually behaves, and the
   gate fails closed on a reintroduced literal so it cannot regress silently.

## Consequences

- **The app is reachable again.** Guard redirects, the side-nav links, the forbidden/not-found actions,
  and the server `redirect()` guards all resolve to a single `/admin` prefix.
- **A reintroduced literal fails CI.** The arch-gate rule blocks a new `<Link href="/admin...">`,
  `router.push/replace("/admin...")`, or bare `redirect("/admin...")` in changed code; a planted-violation
  test confirmed the rule detects each of those forms (and leaves `NextResponse.redirect` and the raw APIs
  clean), and `check:discriminate` keeps the gate's overall detection floor non-vacuous.
- **Honest limits.** The gate is line-based: a `<Link>` whose `href` is on a different line than the tag,
  or a path assembled from a variable (`` `/admin${x}` `` split across lines), would slip past the regex.
  Those are caught by the server/preview click-through and by the `wrappers.test.tsx` assertion, not the
  gate alone. The fix was verified by typecheck, the full unit suite (the guard tests now assert
  basePath-relative targets), and a real Vercel preview click-through (recorded on the PR).
