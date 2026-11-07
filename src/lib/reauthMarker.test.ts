import { beforeEach, describe, expect, it, vi } from "vitest";

// The marker is HMAC-signed with INTERNAL_CALL_SECRET; set one for the test.
beforeEach(() => {
  vi.stubEnv("INTERNAL_CALL_SECRET", "test-internal-secret");
});

import { signReauthMarker, verifyReauthMarker } from "./reauthMarker";

describe("reauth marker", () => {
  it("accepts a fresh marker for the same user", () => {
    const now = 1_000_000;
    const marker = signReauthMarker("user-1", now);
    expect(verifyReauthMarker(marker, "user-1", now + 1000)).toBe(true);
  });

  it("rejects an expired marker", () => {
    const now = 1_000_000;
    const marker = signReauthMarker("user-1", now, 1000);
    expect(verifyReauthMarker(marker, "user-1", now + 2000)).toBe(false);
  });

  it("rejects a marker bound to a different user (no cross-user reuse)", () => {
    const now = 1_000_000;
    const marker = signReauthMarker("user-1", now);
    expect(verifyReauthMarker(marker, "user-2", now + 1000)).toBe(false);
  });

  it("rejects a tampered signature", () => {
    const now = 1_000_000;
    const marker = signReauthMarker("user-1", now);
    const tampered = marker.slice(0, -2) + (marker.endsWith("00") ? "11" : "00");
    expect(verifyReauthMarker(tampered, "user-1", now + 1000)).toBe(false);
  });

  it("rejects a forged expiry (changing the timestamp breaks the HMAC)", () => {
    const now = 1_000_000;
    const marker = signReauthMarker("user-1", now, 1000);
    const mac = marker.slice(marker.indexOf(".") + 1);
    const forged = `${now + 10_000_000}.${mac}`;
    expect(verifyReauthMarker(forged, "user-1", now + 2000)).toBe(false);
  });

  it("rejects empty/garbage", () => {
    expect(verifyReauthMarker(undefined, "user-1")).toBe(false);
    expect(verifyReauthMarker("", "user-1")).toBe(false);
    expect(verifyReauthMarker("nope", "user-1")).toBe(false);
  });
});
