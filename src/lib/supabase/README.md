# src/lib/supabase — the only place a Supabase client is created

Per `decisions.md`, `AGENTS.md`, the mechanical `arch-gate.config.json` rule "Exactly one Supabase
client", and the ESLint `no-restricted-imports` rule, `@supabase/ssr` and `@supabase/supabase-js` may
be imported **only** inside this folder. Everywhere else imports the configured client from here.

The clients (built in TP1-02 / P1-06, see ADR-0005):

- `client.ts` — the browser (anon) client, for client components doing non-auth reads. No auth happens
  here.
- `server.ts` — the per-request cookie-bound clients: `createServerSupabase()` for Server
  Components / Actions / Route Handlers, and `updateSession()` for middleware. The only place the session
  is read or written. Session cookies are HttpOnly and scoped to `/admin`.
- `admin.ts` — the `service_role` client, server-only, bypasses RLS. Never import it from a client
  component (a runtime guard enforces this).

`config.ts` holds the lazily-read connection values. The generated database types live at
`src/lib/database.types.ts`.
