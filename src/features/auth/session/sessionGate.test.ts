import { describe, expect, it } from "vitest";
import { decideSessionGate, type SessionGateInput } from "./sessionGate";

function input(over: Partial<SessionGateInput> = {}): SessionGateInput {
  return { path: "/politicians", authenticated: true, activityState: "active", ...over };
}

describe("decideSessionGate", () => {
  it("allows an active session", () => {
    expect(decideSessionGate(input())).toEqual({ action: "allow" });
  });

  it("allows when the activity state is unknown (fail open — RLS still protects data)", () => {
    expect(decideSessionGate(input({ activityState: null }))).toEqual({ action: "allow" });
  });

  it("allows an unauthenticated request regardless of state", () => {
    expect(decideSessionGate(input({ authenticated: false, activityState: "idle-expired" }))).toEqual({
      action: "allow",
    });
  });

  it("sends an idle-expired session to the expired screen with the idle cause", () => {
    expect(decideSessionGate(input({ activityState: "idle-expired" }))).toEqual({
      action: "expired",
      cause: "idle",
    });
  });

  it("sends an absolute-expired session to the expired screen with the absolute cause", () => {
    expect(decideSessionGate(input({ activityState: "absolute-expired" }))).toEqual({
      action: "expired",
      cause: "absolute",
    });
  });

  it("does NOT fire on the expired screen itself (no loop)", () => {
    expect(decideSessionGate(input({ path: "/session-expired", activityState: "idle-expired" }))).toEqual({
      action: "allow",
    });
  });

  it("does NOT fire on the session-management endpoints", () => {
    for (const path of ["/api/session/activity", "/api/sign-out", "/api/session/sign-out-others"]) {
      expect(decideSessionGate(input({ path, activityState: "idle-expired" }))).toEqual({ action: "allow" });
    }
  });

  it("does NOT fire on a public path (an authenticated visitor to sign-in)", () => {
    expect(decideSessionGate(input({ path: "/sign-in", activityState: "absolute-expired" }))).toEqual({
      action: "allow",
    });
  });
});
