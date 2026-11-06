// request-password-reset: called by the TrackPoli server when an administrator asks to reset a forgotten
// password (TP1-03, ADR-0008). It is a PRE-AUTHENTICATION function (the user has no session), so it is
// gated by assertInternalCall and composes _shared exactly like sign-in-check. It verifies the bot check
// and the rate limits, then — and ONLY for a real, active, password-capable (non-Google-only) account —
// triggers the Supabase recovery email, whose link lands on the shared /auth/confirm Continue page.
//
// It ALWAYS returns the same { ok: true } envelope whether or not the address has an account, so the
// response never reveals account existence (the OWASP Forgot Password enumeration control). The uniform
// minimum-duration timing floor is applied by the server core (performPasswordReset), the same way the
// sign-in flow equalises its account-related outcomes. Nothing on the account is changed here (no lockout,
// no mutation) — only a valid token presented later changes anything — so the endpoint cannot be used to
// lock out or probe users.

import { z } from "npm:zod@4";
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { serve } from "../_shared/serve.ts";
import { assertInternalCall } from "../_shared/auth.ts";
import { AppError } from "../_shared/errors.ts";
import { enforceRateLimit, rateKey } from "../_shared/rateLimit.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";
import { writeOperationalError } from "../_shared/events.ts";

const Body = z
  .object({
    email: z.string().email().transform((s) => s.trim().toLowerCase()),
    turnstileToken: z.string().min(1),
  })
  .strict();

// Throttle so a reset cannot flood an inbox or probe addresses at scale (Forgot Password cheat sheet):
// per-account AND per-IP, both fixed-window (migration 004 rate_limit_check).
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 20;
const WINDOW_SECONDS = 60 * 60;

// Eligible = an active account that actually has a password (an `email` identity). A Google-only account
// has no password to recover, so it gets the identical screen but no email (ADR-0008). Reads only what it
// needs and never returns account state to the caller.
async function recoveryEligible(admin: SupabaseClient, email: string): Promise<boolean> {
  const { data: profile } = await admin
    .from("profiles")
    .select("id,status")
    .eq("email", email)
    .maybeSingle();
  if (!profile || profile.status !== "active") return false;
  const { data, error } = await admin.auth.admin.getUserById(profile.id);
  if (error || !data.user) return false;
  return (data.user.identities ?? []).some((identity) => identity.provider === "email");
}

serve("request-password-reset", async ({ req, admin, ip, requestId }) => {
  assertInternalCall(req);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new AppError("validation_failed", "Invalid request");
  const { email, turnstileToken } = parsed.data;

  await enforceRateLimit(admin, rateKey("request-password-reset", "email", email), MAX_PER_EMAIL, WINDOW_SECONDS);
  await enforceRateLimit(admin, rateKey("request-password-reset", "ip", ip ?? "unknown"), MAX_PER_IP, WINDOW_SECONDS);
  await verifyTurnstile(turnstileToken, ip);

  if (await recoveryEligible(admin, email)) {
    // The redirect base comes from server config, never the request Host, to block host-header injection
    // of the reset link (Forgot Password cheat sheet). The link lands on the Continue page, which exchanges
    // the one-time token only after an explicit click, so an email scanner cannot consume it.
    const siteUrl = Deno.env.get("SITE_URL") ?? "";
    const { error } = await admin.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/confirm`,
    });
    if (error) {
      // Never leak eligibility through the response: report the send failure and still return ok. During
      // the domain-blocked period (Q-1-21, no SMTP configured yet) this send is expected to fail.
      await writeOperationalError(admin, {
        severity: "warning",
        source: "edge_function",
        component: "request-password-reset",
        errorCode: "recovery_email_send_failed",
        message: "Recovery email could not be sent",
        requestId,
        release: Deno.env.get("RELEASE") ?? null,
        environment: Deno.env.get("ENVIRONMENT") ?? null,
      }).catch(() => undefined);
    }
  }

  return { ok: true };
});
