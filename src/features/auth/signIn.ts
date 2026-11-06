// Sign-in orchestration (ADR-0005). One fixed order per attempt: bot-check + lockout (sign-in-check) →
// password attempt → record a failure (auth-event). Every account-related failure — a paused account, an
// unknown email, a wrong password — is answered without revealing which credential was wrong or whether
// the email exists, and is padded to a fixed minimum duration so the cases are indistinguishable in time.
//
// The lockout STATE it surfaces (attempts remaining, or a pause with its end time) is computed identically
// for any email from the email-hash counter, so showing it does not leak account existence (ADR-0005). A
// bot-check or rate-limit block is not account-related, so it is its own outcome and is not padded.
//
// performSignIn() takes its effects as ports, so the enumeration/timing behaviour is unit-tested with
// fakes; buildSignInPorts() wires the real Edge Functions and the cookie-bound Supabase client.

import { createServerSupabase } from "@/lib/supabase/server";
import { report } from "@/lib/report";
import { EdgeFunctionError, invokeInternalFunction } from "./edgeClient";

// Minimum duration for any account-related failure response, so paused/unknown/wrong-password outcomes
// cannot be told apart by timing. Best-effort: a cold start can still exceed it (see ADR-0005).
export const SIGN_IN_TIMING_FLOOR_MS = 750;

export type SignInResult =
  | { outcome: "success" }
  | { outcome: "failed"; attemptsRemaining: number | null }
  | { outcome: "locked"; lockedUntil: string | null }
  | { outcome: "blocked"; reason: "turnstile" | "rate_limited"; retryAfterSeconds?: number };

export interface SignInInput {
  email: string;
  password: string;
  turnstileToken: string;
  ip: string | null;
}

/** Thrown by the checkSignIn port for a non-account block (bot check failed, or rate limited). */
export class SignInBlocked extends Error {
  readonly reason: "turnstile" | "rate_limited";
  readonly retryAfterSeconds?: number;
  constructor(reason: "turnstile" | "rate_limited", retryAfterSeconds?: number) {
    super(reason);
    this.name = "SignInBlocked";
    this.reason = reason;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface SignInPorts {
  checkSignIn(input: {
    email: string;
    turnstileToken: string;
    ip: string | null;
  }): Promise<{ allowed: boolean; lockedUntil: string | null }>;
  attemptPassword(email: string, password: string): Promise<boolean>;
  recordFailure(input: {
    email: string;
    ip: string | null;
  }): Promise<{ locked: boolean; lockedUntil: string | null; attemptsRemaining: number | null }>;
  now(): number;
  sleep(ms: number): Promise<void>;
}

export async function performSignIn(input: SignInInput, ports: SignInPorts): Promise<SignInResult> {
  const start = ports.now();

  let check: { allowed: boolean; lockedUntil: string | null };
  try {
    check = await ports.checkSignIn({
      email: input.email,
      turnstileToken: input.turnstileToken,
      ip: input.ip,
    });
  } catch (error) {
    if (error instanceof SignInBlocked) {
      return { outcome: "blocked", reason: error.reason, retryAfterSeconds: error.retryAfterSeconds };
    }
    throw error;
  }

  if (!check.allowed) {
    await pad(ports, start); // account is already paused
    return { outcome: "locked", lockedUntil: check.lockedUntil };
  }

  const ok = await ports.attemptPassword(input.email, input.password);
  if (ok) {
    return { outcome: "success" };
  }

  const failure = await ports.recordFailure({ email: input.email, ip: input.ip });
  await pad(ports, start);
  return failure.locked
    ? { outcome: "locked", lockedUntil: failure.lockedUntil }
    : { outcome: "failed", attemptsRemaining: failure.attemptsRemaining };
}

async function pad(ports: SignInPorts, start: number): Promise<void> {
  const elapsed = ports.now() - start;
  if (elapsed < SIGN_IN_TIMING_FLOOR_MS) {
    await ports.sleep(SIGN_IN_TIMING_FLOOR_MS - elapsed);
  }
}

/** The production ports: the real Edge Functions and the cookie-bound Supabase client. */
export function buildSignInPorts(): SignInPorts {
  return {
    async checkSignIn({ email, turnstileToken, ip }) {
      try {
        const data = await invokeInternalFunction<{ allowed: boolean; lockedUntil: string | null }>(
          "sign-in-check",
          { email, turnstileToken },
          ip,
        );
        return { allowed: data.allowed, lockedUntil: data.lockedUntil };
      } catch (error) {
        if (error instanceof EdgeFunctionError) {
          if (error.code === "validation_failed") throw new SignInBlocked("turnstile");
          if (error.code === "rate_limited") throw new SignInBlocked("rate_limited", error.retryAfterSeconds);
        }
        throw error;
      }
    },
    async attemptPassword(email, password) {
      const supabase = await createServerSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      return !error && Boolean(data.user);
    },
    async recordFailure({ email, ip }) {
      try {
        return await invokeInternalFunction<{
          locked: boolean;
          lockedUntil: string | null;
          attemptsRemaining: number | null;
        }>("auth-event", { email }, ip);
      } catch (error) {
        // The failure is recorded server-side regardless; if the call itself fails we report it and fall
        // back to the generic outcome with no count, so a hiccup cannot leak which path was taken.
        report("warning", "auth-event call failed", {
          reason: error instanceof Error ? error.message : String(error),
        });
        return { locked: false, lockedUntil: null, attemptsRemaining: null };
      }
    },
    now: () => Date.now(),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
}
