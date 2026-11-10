import { describe, expect, it } from "vitest";
import { computeSessionPhase, type PhaseInput } from "./idleTimer";

// Shortened, legible limits: 15-min idle, 4-h absolute, 2-min warning lead — in ms.
const limits = { idleMs: 15 * 60_000, absoluteMs: 4 * 60 * 60_000, warnLeadMs: 2 * 60_000 };

function at(over: Partial<PhaseInput>): PhaseInput {
  return { now: 0, lastActivity: 0, sessionStart: 0, limits, ...over };
}

describe("computeSessionPhase — idle path", () => {
  it("is active well within the idle window", () => {
    const r = computeSessionPhase(at({ now: 5 * 60_000 }));
    expect(r.phase).toBe("active");
    expect(r.cause).toBe("idle");
    expect(r.msUntilExpiry).toBe(10 * 60_000);
  });

  it("enters idle-warn exactly at the warning lead (13:00)", () => {
    expect(computeSessionPhase(at({ now: 13 * 60_000 })).phase).toBe("idle-warn");
  });

  it("is still active one millisecond before the warning lead", () => {
    expect(computeSessionPhase(at({ now: 13 * 60_000 - 1 })).phase).toBe("active");
  });

  it("stays idle-warn through the countdown", () => {
    expect(computeSessionPhase(at({ now: 14 * 60_000 })).phase).toBe("idle-warn");
  });

  it("expires exactly at the idle limit (15:00)", () => {
    const r = computeSessionPhase(at({ now: 15 * 60_000 }));
    expect(r.phase).toBe("expired");
    expect(r.msUntilExpiry).toBe(0);
  });

  it("is expired past the idle limit", () => {
    expect(computeSessionPhase(at({ now: 20 * 60_000 })).phase).toBe("expired");
  });

  it("resets when activity is more recent than the session start", () => {
    // 14 min elapsed, but last activity was 1 min ago -> active, idle deadline is 14 min out.
    const r = computeSessionPhase(at({ now: 14 * 60_000, lastActivity: 13 * 60_000 }));
    expect(r.phase).toBe("active");
    expect(r.msUntilExpiry).toBe(14 * 60_000);
  });
});

describe("computeSessionPhase — absolute path", () => {
  const fresh = { now: 0, lastActivity: 0, sessionStart: 0, limits };

  it("enters absolute-warn two minutes before the 4-hour cap", () => {
    // Kept active the whole time (lastActivity tracks now), so only the absolute cap can fire.
    const now = 4 * 60 * 60_000 - 2 * 60_000;
    const r = computeSessionPhase({ ...fresh, now, lastActivity: now });
    expect(r.phase).toBe("absolute-warn");
    expect(r.cause).toBe("absolute");
  });

  it("expires at the 4-hour cap even while active", () => {
    const now = 4 * 60 * 60_000;
    const r = computeSessionPhase({ ...fresh, now, lastActivity: now });
    expect(r.phase).toBe("expired");
    expect(r.cause).toBe("absolute");
  });

  it("the absolute cap wins a tie with the idle deadline", () => {
    // Construct now where idleDeadline === absoluteDeadline: lastActivity = absolute - idle.
    const now = 4 * 60 * 60_000;
    const lastActivity = now - limits.idleMs; // idle deadline == absolute deadline == now
    const r = computeSessionPhase({ ...fresh, now, lastActivity, sessionStart: 0 });
    expect(r.phase).toBe("expired");
    expect(r.cause).toBe("absolute");
  });

  it("reports the absolute cause once it is the nearer deadline, even while idle-active", () => {
    // 3h59m elapsed, active 10s ago: idle deadline is far, absolute deadline is 1 min out -> absolute-warn.
    const now = 4 * 60 * 60_000 - 60_000;
    const r = computeSessionPhase({ ...fresh, now, lastActivity: now - 10_000, sessionStart: 0 });
    expect(r.cause).toBe("absolute");
    expect(r.phase).toBe("absolute-warn");
  });
});
