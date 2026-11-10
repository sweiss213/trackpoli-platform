import { describe, expect, it } from "vitest";
import { AUTH_CHANNEL_NAME, parseAuthMessage } from "./authChannel";

describe("parseAuthMessage", () => {
  it("accepts a signed-out signal", () => {
    expect(parseAuthMessage({ type: "signed-out" })).toEqual({ type: "signed-out" });
  });

  it("accepts activity and stay signals with a numeric timestamp", () => {
    expect(parseAuthMessage({ type: "activity", at: 1234 })).toEqual({ type: "activity", at: 1234 });
    expect(parseAuthMessage({ type: "stay", at: 9999 })).toEqual({ type: "stay", at: 9999 });
  });

  it("ignores extra fields (e.g. the storage-fallback nonce)", () => {
    expect(parseAuthMessage({ type: "activity", at: 5, nonce: 0.12 })).toEqual({ type: "activity", at: 5 });
  });

  it("rejects unknown types, missing/invalid timestamps, and non-objects", () => {
    expect(parseAuthMessage({ type: "boom" })).toBeNull();
    expect(parseAuthMessage({ type: "activity" })).toBeNull();
    expect(parseAuthMessage({ type: "activity", at: "soon" })).toBeNull();
    expect(parseAuthMessage({ type: "activity", at: Number.NaN })).toBeNull();
    expect(parseAuthMessage(null)).toBeNull();
    expect(parseAuthMessage("signed-out")).toBeNull();
    expect(parseAuthMessage(42)).toBeNull();
  });

  it("exposes the shared channel name", () => {
    expect(AUTH_CHANNEL_NAME).toBe("trackpoli-auth");
  });
});
