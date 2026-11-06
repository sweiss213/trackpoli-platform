// auth-event: called by the TrackPoli server AFTER a failed sign-in attempt. It records the failure
// against the per-account lockout (migration 010) and writes the audit event(s). A SUCCESSFUL sign-in is
// not handled here — the migration-007 trigger on auth.users already writes `auth.sign_in` and clears the
// lockout. The event stores the email HASH, not the raw address, so attempts correlate without persisting
// who was targeted (sign_in_lockouts.email_hash is not-personal per data-map.json).

import { z } from "npm:zod@4";
import { serve } from "../_shared/serve.ts";
import { assertInternalCall, emailHash } from "../_shared/auth.ts";
import { AppError } from "../_shared/errors.ts";
import { writeEvent } from "../_shared/events.ts";

const Body = z
  .object({
    email: z.string().email().transform((s) => s.trim().toLowerCase()),
  })
  .strict();

serve("auth-event", async ({ req, admin, ip, requestId }) => {
  assertInternalCall(req);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new AppError("validation_failed", "Invalid request");
  const hash = await emailHash(parsed.data.email);

  // Record the failed attempt. Returns the pause end when this failure puts (or leaves) the account in a
  // pause, otherwise null.
  const { data, error } = await admin.rpc("record_sign_in_failure", { p_hash: hash });
  if (error) throw error; // unknown DB failure -> serve() maps to `internal`
  const lockedUntil = (data as string | null) ?? null;

  // How many attempts remain before a pause (null once paused). The DB owns the threshold and computes
  // the count (sign_in_attempts_remaining, migration 011), so the server keeps no copy of it. Computed
  // identically for any email from the hash counter, so surfacing it does not reveal whether the email has
  // an account (ADR-0005).
  let attemptsRemaining: number | null = null;
  if (lockedUntil === null) {
    const { data: remaining, error: remainingError } = await admin.rpc("sign_in_attempts_remaining", {
      p_hash: hash,
    });
    if (remainingError) throw remainingError; // unknown DB failure -> serve() maps to `internal`
    attemptsRemaining = typeof remaining === "number" ? remaining : null;
  }

  // If writing the event fails we return `internal` (serve); the failure counter stays incremented, which
  // fails safe toward MORE protection, and record_sign_in_failure has no inverse to roll back.
  await writeEvent(admin, {
    actor: null,
    action: "auth.sign_in_failed",
    summary: "Failed sign-in attempt",
    details: { emailHash: hash },
    ip,
    requestId,
  });

  if (lockedUntil !== null) {
    await writeEvent(admin, {
      actor: null,
      action: "auth.account_locked",
      summary: "Sign-in paused after repeated failures",
      details: { emailHash: hash, lockedUntil },
      ip,
      requestId,
    });
  }

  return { locked: lockedUntil !== null, lockedUntil, attemptsRemaining };
});
