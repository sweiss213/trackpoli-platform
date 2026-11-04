import type { NextConfig } from "next";

// TrackPoli admin app. The admin app is the only app on the domain for now and lives under /admin
// (Phase 1 plan, P1-01, Q-1-16/Q-1-21): basePath puts every page, asset and API route under /admin.
// Security headers (HSTS, CSP with a per-request nonce, frame-ancestors none, X-Robots-Tag: noindex)
// are added in the hardening task (P1-16), not here.
const nextConfig: NextConfig = {
  basePath: "/admin",
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
