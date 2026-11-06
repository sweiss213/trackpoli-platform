import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Unit / component tests (Vitest + React Testing Library). pgTAP database tests run separately through
// `supabase test db`; Playwright end-to-end tests run through `npm run e2e`.
export default defineConfig({
  plugins: [react()],
  // Mirror the tsconfig "@/*" -> "src/*" path alias so tests resolve app imports the same way the build does.
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
