// Fixed-window rate limiting shared by every function. Backed by rate_limit_check (service role only;
// migration 004). The key combines the action and the caller/address so one visitor cannot exhaust a
// shared limit (Phase 1 plan, section 4).

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { AppError } from "./errors.ts";

// Builds a stable key, e.g. rateKey("sign-in-check", "ip", "1.2.3.4").
export function rateKey(action: string, dimension: string, value: string): string {
  return `${action}:${dimension}:${value}`;
}

// Throws `rate_limited` (with Retry-After) when the call is over the limit; returns otherwise.
export async function enforceRateLimit(
  admin: SupabaseClient,
  key: string,
  max: number,
  windowSeconds: number,
): Promise<void> {
  const { data, error } = await admin.rpc("rate_limit_check", {
    p_key: key,
    p_max: max,
    p_window: `${windowSeconds} seconds`,
  });
  if (error) throw error;
  if (data === false) {
    throw new AppError("rate_limited", "Too many requests", undefined, windowSeconds);
  }
}
