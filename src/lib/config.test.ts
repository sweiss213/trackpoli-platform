import { describe, expect, it } from "vitest";
import { resolveSessionLimits, SESSION_LIMIT_DEFAULTS } from "./config";

describe("resolveSessionLimits", () => {
  it("returns the production defaults when no env is set", () => {
    expect(resolveSessionLimits({})).toEqual(SESSION_LIMIT_DEFAULTS);
  });

  it("applies valid overrides (so a test can shorten the limits)", () => {
    const limits = resolveSessionLimits({
      SESSION_IDLE_MS: "5000",
      SESSION_ABSOLUTE_MS: "20000",
      SESSION_WARN_LEAD_MS: "1000",
      SESSION_ACTIVITY_PING_MS: "500",
      SESSION_ACCESS_TOKEN_MS: "3000",
    });
    expect(limits).toEqual({
      idleMs: 5000,
      absoluteMs: 20000,
      warnLeadMs: 1000,
      activityPingMs: 500,
      accessTokenMs: 3000,
    });
  });

  it("falls back to the default on a non-numeric, zero, negative, or fractional override", () => {
    const limits = resolveSessionLimits({
      SESSION_IDLE_MS: "soon",
      SESSION_ABSOLUTE_MS: "0",
      SESSION_WARN_LEAD_MS: "-1",
      SESSION_ACTIVITY_PING_MS: "1.5",
    });
    expect(limits.idleMs).toBe(SESSION_LIMIT_DEFAULTS.idleMs);
    expect(limits.absoluteMs).toBe(SESSION_LIMIT_DEFAULTS.absoluteMs);
    expect(limits.warnLeadMs).toBe(SESSION_LIMIT_DEFAULTS.warnLeadMs);
    expect(limits.activityPingMs).toBe(SESSION_LIMIT_DEFAULTS.activityPingMs);
  });

  it("clamps the warning lead below both limits so the warning can never be hidden", () => {
    // A lead larger than the idle window would mean "warn before the session begins" — clamp it.
    const limits = resolveSessionLimits({ SESSION_IDLE_MS: "5000", SESSION_WARN_LEAD_MS: "9000" });
    expect(limits.warnLeadMs).toBe(4999);
    expect(limits.warnLeadMs).toBeLessThan(limits.idleMs);
  });

  it("treats an empty string as unset", () => {
    expect(resolveSessionLimits({ SESSION_IDLE_MS: "   " }).idleMs).toBe(SESSION_LIMIT_DEFAULTS.idleMs);
  });
});
