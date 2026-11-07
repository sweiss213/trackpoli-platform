// Warm the admin routes before the parallel suites run. These e2e tests hit `next dev`, which compiles each
// route on first request; with many workers starting at once, several cold-compiles racing the tests can
// blow the per-test timeout. Playwright has already waited for /admin/sign-in (the webServer url) to be
// ready, so here we pre-compile the other routes — pages and their API routes — sequentially. Best-effort:
// failures are ignored and the tests keep their own timeouts.
export default async function globalSetup(): Promise<void> {
  const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
  const routes = [
    "/admin/forgot-password",
    "/admin/reset-password",
    "/admin/auth/confirm",
    "/admin/mfa/enrol",
    "/admin/sign-in/verify",
    "/admin/settings/security",
    "/admin/api/sign-in",
    "/admin/api/request-password-reset",
    "/admin/api/reset-password",
    "/admin/api/auth/confirm",
    "/admin/api/mfa/enrol",
    "/admin/api/mfa/verify",
    "/admin/api/mfa/replace",
    "/admin/api/sign-out",
  ];
  for (const route of routes) {
    try {
      await fetch(`${base}${route}`, { signal: AbortSignal.timeout(90_000) });
    } catch {
      // Ignore: a POST-only API route answers a warm-up GET with 405, which still compiles it, and any
      // failure here just leaves that route to compile on first real hit.
    }
  }
}
