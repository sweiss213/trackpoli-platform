// Two-factor (TOTP) orchestration (ADR-0009). Mandatory MFA for every administrator (NFR-S6, Q-1-01).
//
// These are pure cores plus ports, the same shape as signIn.ts / passwordReset.ts, so the state machine is
// unit-tested with fakes and no part of it imports Next, React, or the DOM. The real ports wrap Supabase's
// native TOTP MFA (auth.mfa.*): Supabase owns secret generation, the otpauth:// provisioning URI, code
// verification, and the aal1 -> aal2 session upgrade. We never implement TOTP or compare codes ourselves.
//
// The route gate (src/middleware.ts) decides WHICH screen a session lands on by assurance level; it is a
// routing layer only. The real authorization boundary is the RLS is_aal2() gate (migrations 001/005/009),
// which denies every aal1 request regardless of routing (ADR-0009, decisions.md).

import { createServerSupabase } from "@/lib/supabase/server";
import { verifyPassword } from "@/lib/supabase/verifier";
import { report } from "@/lib/report";

/** What the enrolment screen needs to render the QR and offer a manual key (from Supabase enroll). */
export interface EnrolStart {
  factorId: string;
  /** SVG/data-URI QR for the otpauth:// URI, as returned by Supabase. */
  qrCode: string;
  /** The base32 secret, for manual entry when a camera is unavailable. */
  secret: string;
  /** The full otpauth:// provisioning URI. */
  uri: string;
}

export type EnrolConfirmResult =
  | { outcome: "enrolled" }
  | { outcome: "invalid_code" }
  | { outcome: "too_many_attempts" };

export type VerifyResult =
  | { outcome: "verified" }
  | { outcome: "invalid_code" }
  | { outcome: "too_many_attempts" }
  | { outcome: "no_factor" };

export type AuthorizeReplacementResult =
  | { outcome: "authorized"; enrol: EnrolStart }
  | { outcome: "reauth_failed" }
  | { outcome: "invalid_current_code" }
  | { outcome: "too_many_attempts" }
  | { outcome: "no_factor" };

export type CompleteReplacementResult =
  | { outcome: "replaced" }
  | { outcome: "invalid_new_code" }
  | { outcome: "too_many_attempts" };

// The result of trying a code against a factor: accepted, wrong/expired (indistinguishable from Supabase),
// or blocked because too many attempts were made (Supabase's own MFA rate limit, surfaced for the
// "setup temporarily paused" / lockout screens — ADR-0009, not a second hand-rolled lockout).
export type VerifyOutcome = "ok" | "invalid" | "rate_limited";

/** Re-authentication proof for the high-risk device-replacement flow (ADR-0009). Email administrators
 *  re-enter their password; Google-only administrators re-authenticate through Google (the route proves the
 *  returning OAuth identity is the same user and passes verified:true). Either is a credential bound to the
 *  account, per OWASP Authentication item 11. */
export type ReauthProof =
  | { kind: "password"; password: string }
  | { kind: "google"; verified: boolean };

export interface MfaPorts {
  /** Begin TOTP enrolment: returns the new (unverified) factor and its QR/secret/URI. */
  enroll(): Promise<EnrolStart>;
  /** Challenge the factor and verify the code in one step. "ok" lifts the session to aal2; "rate_limited"
   *  means too many attempts (Supabase's MFA limit); "invalid" is a wrong or expired code. */
  verifyFactor(factorId: string, code: string): Promise<VerifyOutcome>;
  /** The ids of the caller's currently VERIFIED factors (the replacement invariant keeps this at one). */
  listVerifiedFactorIds(): Promise<string[]>;
  /** Remove a factor (used to drop the old device once the new one is verified). */
  unenroll(factorId: string): Promise<void>;
}

/** Replacement needs everything MfaPorts has plus a re-authentication step. */
export interface ReplacePorts extends MfaPorts {
  reauthenticate(proof: ReauthProof): Promise<boolean>;
}

/** Forced-enrolment step 1: hand the screen a fresh factor to display. */
export async function beginEnrolment(ports: MfaPorts): Promise<EnrolStart> {
  return ports.enroll();
}

/** Forced-enrolment step 2: confirm the code from the authenticator. On success the session is aal2. */
export async function confirmEnrolment(
  input: { factorId: string; code: string },
  ports: MfaPorts,
): Promise<EnrolConfirmResult> {
  const outcome = await ports.verifyFactor(input.factorId, input.code);
  if (outcome === "ok") return { outcome: "enrolled" };
  if (outcome === "rate_limited") return { outcome: "too_many_attempts" };
  return { outcome: "invalid_code" };
}

/** Sign-in step-up: the session is aal1 with a verified factor; verifying a code lifts it to aal2. */
export async function verifySignInChallenge(
  input: { code: string },
  ports: MfaPorts,
): Promise<VerifyResult> {
  const factorIds = await ports.listVerifiedFactorIds();
  const factorId = factorIds[0];
  if (!factorId) {
    // The gate should never route a factorless session here; treat it as a routing miss, not a code error.
    return { outcome: "no_factor" };
  }
  const outcome = await ports.verifyFactor(factorId, input.code);
  if (outcome === "ok") return { outcome: "verified" };
  if (outcome === "rate_limited") return { outcome: "too_many_attempts" };
  return { outcome: "invalid_code" };
}

/** Device replacement step 1 (high-risk, ADR-0009): re-authenticate with a credential bound to the account
 *  AND prove possession of the CURRENT device, then hand back a new factor to enrol. The session alone is
 *  never trusted (OWASP MFA "Changing MFA factors"). No old factor is touched yet. */
export async function authorizeReplacement(
  input: { proof: ReauthProof; currentCode: string },
  ports: ReplacePorts,
): Promise<AuthorizeReplacementResult> {
  const reauthed = await ports.reauthenticate(input.proof);
  if (!reauthed) return { outcome: "reauth_failed" };

  const factorIds = await ports.listVerifiedFactorIds();
  const currentId = factorIds[0];
  if (!currentId) return { outcome: "no_factor" };

  const holdsCurrent = await ports.verifyFactor(currentId, input.currentCode);
  if (holdsCurrent === "rate_limited") return { outcome: "too_many_attempts" };
  if (holdsCurrent !== "ok") return { outcome: "invalid_current_code" };

  const enrol = await ports.enroll();
  return { outcome: "authorized", enrol };
}

/** Device replacement step 2: verify the NEW device, then drop every other factor, so exactly one verified
 *  factor remains (an account is never left with zero or with a stale device). */
export async function completeReplacement(
  input: { newFactorId: string; newCode: string },
  ports: MfaPorts,
): Promise<CompleteReplacementResult> {
  const outcome = await ports.verifyFactor(input.newFactorId, input.newCode);
  if (outcome !== "ok") {
    // Best-effort cleanup of the unverified new factor so a failed attempt does not leave an orphan; a
    // cleanup failure is reported, not thrown, so it cannot mask the outcome (decisions.md).
    try {
      await ports.unenroll(input.newFactorId);
    } catch (error) {
      report("warning", "mfa replacement cleanup failed", {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
    return outcome === "rate_limited" ? { outcome: "too_many_attempts" } : { outcome: "invalid_new_code" };
  }

  // The new factor is now verified and active, so the replacement has SUCCEEDED. Removing the old factor(s)
  // is best-effort cleanup: on failure we report it and still return "replaced", because throwing here would
  // wrongly tell the user nothing changed while their new device already works (judge-arch F1). It can
  // briefly leave more than one verified factor until a retry or an operator clears the stale one.
  try {
    const stale = (await ports.listVerifiedFactorIds()).filter((id) => id !== input.newFactorId);
    for (const id of stale) {
      await ports.unenroll(id);
    }
  } catch (error) {
    report("warning", "mfa replacement: stale factor not removed", {
      reason: error instanceof Error ? error.message : String(error),
    });
  }
  return { outcome: "replaced" };
}

/** The production ports: the real Supabase native TOTP MFA, bound to the cookie session. Used by the
 *  enrol and verify routes (and the complete-replacement step). The replacement's reauthenticate port is
 *  wired with the replacement screen (ADR-0009); it needs the OAuth round-trip for Google-only accounts. */
export function buildMfaPorts(): MfaPorts {
  return {
    async enroll() {
      const supabase = await createServerSupabase();
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error || !data) {
        throw new Error(`mfa enroll failed: ${error?.message ?? "no data"}`);
      }
      return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret, uri: data.totp.uri };
    },
    async verifyFactor(factorId, code) {
      const supabase = await createServerSupabase();
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (!error) return "ok";
      // Supabase rate-limits repeated MFA attempts; surface that distinctly so the UI can show the
      // "setup temporarily paused" / lockout state instead of a plain wrong-code message. A wrong or
      // expired code is an expected business outcome, not an error to report.
      const status = (error as { status?: number }).status;
      const code429 = status === 429 || /rate|too many|limit/i.test(error.message);
      return code429 ? "rate_limited" : "invalid";
    },
    async listVerifiedFactorIds() {
      const supabase = await createServerSupabase();
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error || !data) {
        throw new Error(`mfa listFactors failed: ${error?.message ?? "no data"}`);
      }
      return data.totp.filter((factor) => factor.status === "verified").map((factor) => factor.id);
    },
    async unenroll(factorId) {
      const supabase = await createServerSupabase();
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) {
        throw new Error(`mfa unenroll failed: ${error.message}`);
      }
    },
  };
}

/** Production replacement ports: the MFA ports plus re-authentication (ADR-0009). The password path verifies
 *  the current user's password without disturbing the live session (verifier client); the Google path trusts
 *  the `verified` flag the route derives from the HMAC re-auth marker, so this port never has to redo the
 *  OAuth round-trip. */
export function buildReplacePorts(): ReplacePorts {
  return {
    ...buildMfaPorts(),
    async reauthenticate(proof) {
      if (proof.kind === "google") return proof.verified;
      const supabase = await createServerSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      // A Google-only account has no email/password identity, so a password proof can never be valid for it.
      if (!user?.email) return false;
      return verifyPassword(user.email, proof.password);
    },
  };
}
