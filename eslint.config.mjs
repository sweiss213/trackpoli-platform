import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // The Supabase client is created in exactly one place per context (src/lib/supabase). Everywhere else
  // imports the configured client; nowhere else constructs one. This mirrors the mechanical arch-gate
  // rule "Exactly one Supabase client" (arch-gate.config.json) and the P1-01 acceptance criterion.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/supabase/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@supabase/supabase-js", message: "Create the Supabase client only in src/lib/supabase." },
            { name: "@supabase/ssr", message: "Create the Supabase client only in src/lib/supabase." },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Not application source: vendored engine, SQL, and the enterprise gate self-tests.
    ".claude/**",
    "always-on/**",
    "supabase/**",
    "test/**",
    "scripts/**",
  ]),
]);

export default eslintConfig;
