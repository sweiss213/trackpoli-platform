# Rules for edge functions

- **Compose `_shared`, don't hand-roll.** Caller identity and the privileged client via
  `_shared/auth.ts` (`verifyCaller`, `getAdminClient`, `clientIp`, `emailHash`); the response envelope
  and error taxonomy via `_shared/errors.ts` (`jsonOk`, `jsonError`, `AppError`); CORS via
  `_shared/cors.ts` (`handleCors`, `corsHeaders`); audit/operational writes via `_shared/events.ts`
  (`writeEvent`, `writeOperationalError`); rate limits via `_shared/rateLimit.ts` (`enforceRateLimit`).
  Never read `SUPABASE_SERVICE_ROLE_KEY` or write `Access-Control-Allow-Origin` inline in a handler.
- **Access is decided from `profiles`, not a token claim.** `verifyCaller` loads the caller's profile
  with the service role and rejects a status that is not `active` (except where `allowInvited` is set,
  for `complete-invite` and `record-terms`). Manager-only functions pass `requireAal2: true`. There is
  no `user_roles` table in TrackPoli — role and status live on `profiles`.
- **Handler is thin.** Validate the body with zod (unknown fields rejected; emails trimmed and
  lower-cased) → call one unit of business logic → return via `jsonOk`/`jsonError`. Keep the business
  logic separable and testable, not welded into `Deno.serve`.
- **A change and its event are atomic.** If `writeEvent` fails, undo the change and return `internal`.
- **Errors are reported.** Only unexpected (`internal`) failures call `writeOperationalError` (and
  Sentry) with the request id, release and environment — never an email, name, token or request body in
  the message or context. Expected failures (401/403/404/409/422/429) are not logged as errors.
- **Every function** generates a `request_id` (UUID), returns it in `x-request-id`, and stores it on
  the event it writes. Wrap the handler in `_shared/serve.ts` (`serve`), which does the request_id, CORS,
  admin client, address resolution and the AppError→envelope / internal-reporting mapping once.
- **Pre-authentication functions** (`sign-in-check`, `auth-event`) run before the user has a session, so
  they cannot use `verifyCaller`. They set `verify_jwt = false` in `config.toml` and gate the call with
  `assertInternalCall(req)` (the shared `INTERNAL_CALL_SECRET`), so only the TrackPoli server can call
  them. Turnstile verification for a pre-auth attempt uses `_shared/turnstile.ts` (`verifyTurnstile`).
