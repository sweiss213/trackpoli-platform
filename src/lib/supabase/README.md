# src/lib/supabase — the only place a Supabase client is created

Per `decisions.md`, `AGENTS.md`, the mechanical `arch-gate.config.json` rule "Exactly one Supabase
client", and the ESLint `no-restricted-imports` rule, `@supabase/ssr` and `@supabase/supabase-js` may
be imported **only** inside this folder. Everywhere else imports the configured client from here.

The actual clients — `client.ts` (browser), `server.ts` (server, `@supabase/ssr` cookie session) and
`admin.ts` (service role, server only) — are built in **P1-06** (sign-in), not in TP1-01. This ticket
only establishes the folder and the rule. The generated database types live at
`src/lib/database.types.ts`.
