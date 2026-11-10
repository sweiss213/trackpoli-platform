import { describe, expect, it } from "vitest";
import { ACTIVITY_COOKIE, evaluateActivity, readActivity, signActivity } from "./sessionActivity";

const limits = { idleMs: 15 * 60_000, absoluteMs: 4 * 60 * 60_000 };
const SECRET = "test-internal-secret";

describe("evaluateActivity", () => {
  it("is active within both windows", () => {
    expect(evaluateActivity({ start: 0, last: 0 }, 5 * 60_000, limits)).toBe("active");
  });

  it("is idle-expired exactly at the idle limit", () => {
    expect(evaluateActivity({ start: 0, last: 0 }, 15 * 60_000, limits)).toBe("idle-expired");
  });

  it("is still active one millisecond before the idle limit", () => {
    expect(evaluateActivity({ start: 0, last: 0 }, 15 * 60_000 - 1, limits)).toBe("active");
  });

  it("is absolute-expired at the 4-hour cap even when just active", () => {
    const now = 4 * 60 * 60_000;
    expect(evaluateActivity({ start: 0, last: now }, now, limits)).toBe("absolute-expired");
  });

  it("prefers absolute-expired over idle-expired when both are past", () => {
    const now = 5 * 60 * 60_000; // past both
    expect(evaluateActivity({ start: 0, last: 0 }, now, limits)).toBe("absolute-expired");
  });

  it("stays active when activity keeps advancing below the absolute cap", () => {
    const now = 3 * 60 * 60_000;
    expect(evaluateActivity({ start: 0, last: now - 60_000 }, now, limits)).toBe("active");
  });
});

describe("signActivity / readActivity", () => {
  it("round-trips a signed payload", async () => {
    const cookie = await signActivity({ start: 1000, last: 2000 }, SECRET);
    expect(await readActivity(cookie, SECRET)).toEqual({ start: 1000, last: 2000 });
  });

  it("rejects a cookie signed with a different secret", async () => {
    const cookie = await signActivity({ start: 1000, last: 2000 }, SECRET);
    expect(await readActivity(cookie, "other-secret")).toBeNull();
  });

  it("rejects a tampered payload (timestamps no longer match the signature)", async () => {
    const cookie = await signActivity({ start: 1000, last: 2000 }, SECRET);
    const [, mac] = cookie.split(".");
    const forgedBody = Buffer.from(JSON.stringify({ s: 0, l: 0 })).toString("base64url");
    expect(await readActivity(`${forgedBody}.${mac}`, SECRET)).toBeNull();
  });

  it("rejects empty, malformed, and non-two-part values (fails closed)", async () => {
    expect(await readActivity(undefined, SECRET)).toBeNull();
    expect(await readActivity("", SECRET)).toBeNull();
    expect(await readActivity("nodot", SECRET)).toBeNull();
    expect(await readActivity("!!!.$$$", SECRET)).toBeNull();
  });

  it("exposes a stable cookie name", () => {
    expect(ACTIVITY_COOKIE).toBe("tp-activity");
  });
});
