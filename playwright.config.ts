import { defineConfig, devices } from "@playwright/test";

// End-to-end tests for the admin app (TP1-02). The credential-free sign-in UI suite
// (e2e/sign-in.spec.ts) runs against `next dev` with no Supabase — it exercises the real route and the
// real error UI. The full-stack suite (e2e/sign-in.full-stack.spec.ts, E2E-02) is gated on E2E_FULL_STACK
// and runs only where a local Supabase stack + seed + Turnstile test keys are present.
export default defineConfig({
  testDir: "./e2e",
  // Pre-compile the admin routes before the parallel suites, so cold `next dev` compilation does not race
  // the tests (see e2e/global-setup.ts).
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  // Generous per-test timeout: these suites run against `next dev`, which compiles each route on first
  // hit, so the first navigation to a cold route (several now, in parallel) can take well over the 30s
  // default under compile contention.
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Cap parallelism: these suites run against `next dev`, and too many workers cold-compiling routes at
  // once (a dev machine can default to 10+) overwhelms on-demand compilation and times out navigations.
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/admin/sign-in",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
