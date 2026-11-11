# 0016. Redirect the bare domain root ("/") to the /admin basePath

Date: 2026-11-10

## Status

Accepted

## Context

The admin app is served under `basePath: "/admin"` (next.config.ts, P1-01), so every page, asset and API
route lives under `/admin`. The **bare domain root** (`https://<domain>/`, i.e. `"/"`) therefore has no
page and returns a 404 — a visitor who types the domain without the `/admin` path hits a dead end on an
app that is otherwise live. The admin app is the only app on the domain for now, so `"/"` should simply
take the visitor into the app.

Next.js `redirects()` interacts with `basePath` in a way that is easy to get wrong, so the exact behaviour
was verified against the installed **Next 16.4.5** source (`next/dist/lib/load-custom-routes.js`) rather
than assumed:

- `const srcBasePath = config.basePath && r.basePath !== false ? config.basePath : ''` (line 327): a
  redirect's **source** gets the basePath prepended unless the entry sets `basePath: false`.
- `const destBasePath = srcBasePath && !isExternal ? srcBasePath : ''` (line 329): the **destination**
  gets the basePath prepended only when the source did.

So a naive `{ source: "/", destination: "/admin" }` would become `source: "/admin"` (matching `/admin`,
not the real root) **and** `destination: "/admin/admin"` (a double-prefixed 404). Next's own internal
basePath redirects (lines 553-578) confirm the fix: they use `basePath: false` with a literal
`config.basePath` destination.

## Decision

Add an app-level redirect in `next.config.ts`:

```ts
async redirects() {
  return [{ source: "/", destination: "/admin", basePath: false, permanent: false }];
}
```

- **`basePath: false`** is required: it opts the entry out of basePath prepending for **both** the source
  and the destination, so the rule matches the real root `"/"` and targets `"/admin"` literally.
- **`permanent: false`** (HTTP 307) so browsers do not hard-cache the redirect; if the app's root structure
  changes later (e.g. a public landing page at `"/"`), a cached 308 would be painful to undo.

`"/" → /admin` then routes on through the normal guards to `/admin/sign-in` for an anonymous visitor.

### Options considered

1. **Do nothing; `"/"` stays a 404.** Rejected: the domain root is the most likely URL a human types, and a
   404 on a live app reads as broken.
2. **A page/route at `"/"`.** Rejected: `"/"` is outside the basePath, so it cannot be an App Router page in
   this app; it would need a separate app or a rewrite, which is more machinery than a one-line redirect.
3. **`permanent: true` (308).** Rejected: a permanent redirect is browser-cached aggressively; if a real
   root page is ever added, cached 308s would keep sending users to `/admin`. `permanent: false` keeps it
   reversible.
4. **A redirect with `basePath: false` and `permanent: false` (chosen).** Minimal, matches the real root,
   targets `/admin` without doubling, and is not cached.

## Consequences

- **The domain root works.** Hitting `https://<domain>/` lands on `/admin` and then `/admin/sign-in`,
  instead of a 404.
- **Verified, not assumed.** The `basePath: false` behaviour is backed by the Next 16.4.5 source
  (`load-custom-routes.js:327/329`); the redirect is confirmed on the PR build/preview and production.
- **Reversible.** `permanent: false` means a later change (a public landing page at `"/"`) is not fought by
  browser-cached permanent redirects. Removing the one `redirects()` entry restores the prior behaviour.
- **Honest limit.** This covers only the exact root `"/"`. Other outside-basePath paths (e.g. a mistyped
  `"/sign-in"` with no `/admin` prefix) still 404; that is acceptable — the root is the one a human types.
