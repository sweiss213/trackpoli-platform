import type { NextConfig } from "next";

// TrackPoli admin app. The admin app is the only app on the domain for now and lives under /admin
// (Phase 1 plan, P1-01, Q-1-16/Q-1-21): basePath puts every page, asset and API route under /admin.
// Security headers (HSTS, CSP with a per-request nonce, frame-ancestors none, X-Robots-Tag: noindex)
// are added in the hardening task (P1-16), not here.
//
// Cache Components (cacheComponents / partialPrefetching) is intentionally OFF (ADR-0013): the root
// layout resolves the session (cookies, via getSessionUser) on every route, which Cache Components'
// strict prerender check rejects for the static /_not-found route on Vercel's build, failing the deploy.
// The admin app is auth-gated and per-user, so partial prerendering buys little now; proper adoption
// (Suspense boundaries around the session access + loading states) is deferred to the P1-12 app shell.
const nextConfig: NextConfig = {
  basePath: "/admin",
  // The admin app lives entirely under /admin, so the bare domain root ("/") has no page and 404s. Send
  // visitors from "/" to "/admin" (which then routes on to /admin/sign-in). `basePath: false` is REQUIRED:
  // Next otherwise prepends the basePath to BOTH the source and the destination of a redirect
  // (load-custom-routes.js:327/329 in next 16.4.5), so without it the rule would match "/admin" and target
  // "/admin/admin" instead of the real root -> /admin. `permanent: false` (307) so browsers do not hard-cache
  // it if the app's root structure changes later. ADR-0016.
  async redirects() {
    return [{ source: "/", destination: "/admin", basePath: false, permanent: false }];
  },
};

export default nextConfig;
