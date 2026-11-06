import { defineConfig, devices } from "@playwright/test";

// End-to-end tests for the admin app (TP1-02). The credential-free sign-in UI suite
// (e2e/sign-in.spec.ts) runs against `next dev` with no Supabase — it exercises the real route and the
// real error UI. The full-stack suite (e2e/sign-in.full-stack.spec.ts, E2E-02) is gated on E2E_FULL_STACK
// and runs only where a local Supabase stack + seed + Turnstile test keys are present.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
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
