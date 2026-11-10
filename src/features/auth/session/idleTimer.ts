// The session-phase decision (TP1-05), as a pure function so it is unit-tested directly — no DOM, no React,
// no timers. SessionGuard owns the ticking clock, the activity listeners and the dialog; this owns only the
// rule that turns "now, last activity, session start, and the limits" into a phase. The two warning phases
// map to the two designed dialogs (Figma 1396:175539): idle-warn is the extendable "Stay signed in" dialog,
// absolute-warn is the non-extendable "Sign in again" dialog for the 4-hour cap.
//
// Enforcement is the middleware's signed last-activity cookie (sessionActivity.ts); this is the UX layer.
// The absolute cap wins ties: once the hard 4-hour deadline is reached it is reached, whatever idle says.

import type { SessionLimits } from "@/lib/config";

export type SessionPhase = "active" | "idle-warn" | "absolute-warn" | "expired";

/** Which limit is driving the current countdown / expiry. */
export type ExpiryCause = "idle" | "absolute";

export interface PhaseInput {
  /** Current time (ms epoch). */
  readonly now: number;
  /** When the administrator last interacted (ms epoch). */
  readonly lastActivity: number;
  /** When this session began (ms epoch), for the absolute cap. */
  readonly sessionStart: number;
  readonly limits: Pick<SessionLimits, "idleMs" | "absoluteMs" | "warnLeadMs">;
}

export interface PhaseResult {
  readonly phase: SessionPhase;
  /** The limit nearest to firing — the one the countdown and the warning dialog refer to. */
  readonly cause: ExpiryCause;
  /** Milliseconds until that limit is reached (0 once expired). */
  readonly msUntilExpiry: number;
}

/**
 * Decide the session phase. The effective deadline is the nearer of the idle deadline (lastActivity + idleMs)
 * and the absolute deadline (sessionStart + absoluteMs); the absolute cap wins a tie because it cannot be
 * extended. Within warnLeadMs of that deadline the phase is the matching warning; at or past it, expired.
 */
export function computeSessionPhase(input: PhaseInput): PhaseResult {
  const { now, lastActivity, sessionStart, limits } = input;
  const idleDeadline = lastActivity + limits.idleMs;
  const absoluteDeadline = sessionStart + limits.absoluteMs;

  // Absolute wins ties (<=), so a hard cap is never masked by idle activity.
  const cause: ExpiryCause = absoluteDeadline <= idleDeadline ? "absolute" : "idle";
  const deadline = cause === "absolute" ? absoluteDeadline : idleDeadline;
  const msUntilExpiry = Math.max(0, deadline - now);

  if (now >= deadline) {
    return { phase: "expired", cause, msUntilExpiry: 0 };
  }
  if (now >= deadline - limits.warnLeadMs) {
    return { phase: cause === "absolute" ? "absolute-warn" : "idle-warn", cause, msUntilExpiry };
  }
  return { phase: "active", cause, msUntilExpiry };
}
