import { defineConfig } from "@playwright/test";

// End-to-end tests (Playwright). The Phase 1 e2e suite (sign-in, recovery, invite, role guard, session
// expiry, two-factor, terms) is written in the tasks that build those screens; this is the base config.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000/admin",
    trace: "on-first-retry",
  },
});
