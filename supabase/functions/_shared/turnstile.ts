// Cloudflare Turnstile verification (Q-1-16): every sign-in attempt carries a Turnstile token that the
// server-side secret must validate before we spend a lockout slot or a password check on it. The secret
// lives only in the Edge Function environment (TURNSTILE_SECRET_KEY), never in the browser. Kept in
// _shared so no handler hand-rolls the call.

import { AppError } from "./errors.ts";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type SiteVerifyResponse = { success: boolean; "error-codes"?: string[] };

/** Throws `validation_failed` when the bot check does not pass, `internal` when it cannot be performed. */
export async function verifyTurnstile(token: string, remoteIp: string | null): Promise<void> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) throw new AppError("internal", "Turnstile secret is not configured");

  const form = new URLSearchParams({ secret, response: token });
  if (remoteIp) form.set("remoteip", remoteIp);

  let outcome: SiteVerifyResponse;
  try {
    const response = await fetch(SITEVERIFY_URL, { method: "POST", body: form });
    outcome = (await response.json()) as SiteVerifyResponse;
  } catch {
    // The bot check is a hard dependency; if Cloudflare is unreachable we fail closed as `internal`
    // (reported) rather than letting an unverified attempt through.
    throw new AppError("internal", "Turnstile verification is unavailable");
  }

  if (!outcome.success) {
    throw new AppError("validation_failed", "Bot check failed", "turnstileToken");
  }
}
