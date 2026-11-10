// Session-limit configuration (TP1-05, Q-1-02). The limits are CONFIG, not code: a deployment (and the
// E2E-06 test) overrides them through environment variables, with the production defaults below. Reading is
// kept pure (resolveLimits takes an env bag) so it is unit-testable and runs unchanged in the edge
// middleware, a node route, and the server layout that passes the values to the client. Nothing here is
// NEXT_PUBLIC: the browser never reads these; the layout reads them server-side and hands them to the
// SessionGuard as a prop, so there is one source of truth and the test only has to set server env.
//
// accessTokenMs is the Supabase JWT lifetime (a Supabase project setting, not enforced here); it is recorded
// so the policy lives in one place and the client can reason about refresh timing.

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** Production defaults (Q-1-02): 15-min idle, 4-h absolute, a 2-min warning lead, ≤1 activity ping/min. */
export const SESSION_LIMIT_DEFAULTS = {
  idleMs: 15 * MINUTE,
  absoluteMs: 4 * HOUR,
  warnLeadMs: 2 * MINUTE,
  activityPingMs: 1 * MINUTE,
  accessTokenMs: 5 * MINUTE,
} as const;

export interface SessionLimits {
  /** Sign out after this long with no activity. */
  readonly idleMs: number;
  /** Hard cap on a session regardless of activity. */
  readonly absoluteMs: number;
  /** Show the warning dialog this long before a limit is reached. */
  readonly warnLeadMs: number;
  /** The browser pings activity at most this often (upper bound on ping frequency). */
  readonly activityPingMs: number;
  /** The Supabase access-token lifetime (reference only; enforced by Supabase, not this code). */
  readonly accessTokenMs: number;
}

type EnvBag = Record<string, string | undefined>;

const ENV_KEYS: Record<keyof SessionLimits, string> = {
  idleMs: "SESSION_IDLE_MS",
  absoluteMs: "SESSION_ABSOLUTE_MS",
  warnLeadMs: "SESSION_WARN_LEAD_MS",
  activityPingMs: "SESSION_ACTIVITY_PING_MS",
  accessTokenMs: "SESSION_ACCESS_TOKEN_MS",
};

/** Parse a positive-integer millisecond override; fall back to the default when unset or not a positive int. */
function readMs(env: EnvBag, key: string, fallback: number): number {
  const raw = env[key];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) return fallback;
  return value;
}

/**
 * Resolve the session limits from an env bag (pure). Invalid or missing values fall back to the production
 * default rather than throwing, so a build or an edge request is never broken by a bad override. The warning
 * lead is clamped below the smaller of the two limits, so a misconfiguration can never hide the warning (a
 * lead ≥ the limit would mean "warn before the session starts").
 */
export function resolveSessionLimits(env: EnvBag): SessionLimits {
  const idleMs = readMs(env, ENV_KEYS.idleMs, SESSION_LIMIT_DEFAULTS.idleMs);
  const absoluteMs = readMs(env, ENV_KEYS.absoluteMs, SESSION_LIMIT_DEFAULTS.absoluteMs);
  const requestedLead = readMs(env, ENV_KEYS.warnLeadMs, SESSION_LIMIT_DEFAULTS.warnLeadMs);
  const warnLeadMs = Math.max(0, Math.min(requestedLead, idleMs - 1, absoluteMs - 1));
  return {
    idleMs,
    absoluteMs,
    warnLeadMs,
    activityPingMs: readMs(env, ENV_KEYS.activityPingMs, SESSION_LIMIT_DEFAULTS.activityPingMs),
    accessTokenMs: readMs(env, ENV_KEYS.accessTokenMs, SESSION_LIMIT_DEFAULTS.accessTokenMs),
  };
}

/** The session limits for this process, read from the real environment. */
export function sessionLimits(): SessionLimits {
  return resolveSessionLimits(process.env);
}
