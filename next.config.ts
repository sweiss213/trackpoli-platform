import type { NextConfig } from "next";

// TrackPoli admin app. The admin app is the only app on the domain for now and lives under /admin
// (Phase 1 plan, P1-01, Q-1-16/Q-1-21): basePath puts every page, asset and API route under /admin.
// Security headers (HSTS, CSP with a per-request nonce, frame-ancestors none, X-Robots-Tag: noindex)
// are added in the hardening task (P1-16), not here.
//
// Cache Components (cacheComponents / partialPrefetching) is intentionally OFF (ADR-0012): the root
// layout resolves the session (cookies, via getSessionUser) on every route, which Cache Components'
// strict prerender check rejects for the static /_not-found route on Vercel's build, failing the deploy.
// The admin app is auth-gated and per-user, so partial prerendering buys little now; proper adoption
// (Suspense boundaries around the session access + loading states) is deferred to the P1-12 app shell.
const nextConfig: NextConfig = {
  basePath: "/admin",
};

export default nextConfig;
