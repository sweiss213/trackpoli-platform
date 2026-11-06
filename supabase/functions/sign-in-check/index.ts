// sign-in-check: called by the TrackPoli server BEFORE every sign-in attempt (Q-1-07, Q-1-16). It runs
// the bot check and reads the per-account pause, so a locked account never reaches a password check and a
// robot never spends an attempt. It is enumeration-safe: it reads only the lockout table (keyed by the
// email hash), never `profiles`, so it cannot reveal whether an email has an account. The server, seeing
// `allowed: false`, shows the one generic message and does not attempt the password.

import { z } from "npm:zod@4";
import { serve } from "../_shared/serve.ts";
import { assertInternalCall, emailHash } from "../_shared/auth.ts";
import { AppError } from "../_shared/errors.ts";
import { enforceRateLimit, rateKey } from "../_shared/rateLimit.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";

const Body = z
  .object({
    email: z.string().email().transform((s) => s.trim().toLowerCase()),
    turnstileToken: z.string().min(1),
  })
  .strict();

// Backstop IP limit; the per-account lockout and Turnstile are the primary defences.
const MAX_PER_IP = 30;
const WINDOW_SECONDS = 15 * 60;

serve("sign-in-check", async ({ req, admin, ip }) => {
  assertInternalCall(req);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new AppError("validation_failed", "Invalid request");
  const { email, turnstileToken } = parsed.data;

  await enforceRateLimit(admin, rateKey("sign-in-check", "ip", ip ?? "unknown"), MAX_PER_IP, WINDOW_SECONDS);
  await verifyTurnstile(turnstileToken, ip);

  const hash = await emailHash(email);
  const { data, error } = await admin.rpc("sign_in_paused_until", { p_hash: hash });
  if (error) throw error; // unknown DB failure -> serve() maps to `internal`

  const lockedUntil = (data as string | null) ?? null;
  return { allowed: lockedUntil === null, lockedUntil };
});
