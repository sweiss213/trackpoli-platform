// Supabase connection config, read lazily (inside the getters, not at module load) so that building the
// app without env present does not crash at import time. The browser-exposed values are NEXT_PUBLIC_*;
// the service-role key is server-only and must never be a NEXT_PUBLIC_ variable. See ADR-0005 and
// docs/setup/tp1-02-credentials.md for where each value comes from.

import { requireEnv } from "@/lib/env";

/** Supabase project URL (browser-safe). */
export function supabaseUrl(): string {
  return requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
}

/** Supabase anon/publishable key (browser-safe). */
export function supabaseAnonKey(): string {
  return requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Supabase service-role key (server-only secret; never exposed to the browser). */
export function supabaseServiceRoleKey(): string {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Shared secret the TrackPoli server sends when calling the pre-auth Edge Functions (server-only). */
export function internalCallSecret(): string {
  return requireEnv("INTERNAL_CALL_SECRET", process.env.INTERNAL_CALL_SECRET);
}

/** Whether the browser-safe Supabase env is present, so SSR/build can no-op gracefully when it is not. */
export function hasSupabaseEnv(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
