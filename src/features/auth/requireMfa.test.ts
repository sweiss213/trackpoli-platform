import { describe, expect, it } from "vitest";
import { decideMfaGate, type MfaGateInput, normalisePath } from "./requireMfa";

function input(over: Partial<MfaGateInput> = {}): MfaGateInput {
  return {
    path: "/settings/security",
    authenticated: true,
    currentLevel: "aal2",
    nextLevel: "aal2",
    ...over,
  };
}

describe("normalisePath", () => {
  it("strips the /admin basePath", () => {
    expect(normalisePath("/admin/settings/security")).toBe("/settings/security");
    expect(normalisePath("/admin")).toBe("/");
  });

  it("leaves an already-bare path untouched", () => {
    expect(normalisePath("/sign-in")).toBe("/sign-in");
  });
});

describe("decideMfaGate — unauthenticated", () => {
  it("allows a public path", () => {
    expect(decideMfaGate(input({ authenticated: false, path: "/sign-in", currentLevel: null, nextLevel: null }))).toEqual({
      action: "allow",
    });
  });

  it("sends a protected path to sign-in", () => {
    expect(
      decideMfaGate(input({ authenticated: false, path: "/settings/security", currentLevel: null, nextLevel: null })),
    ).toEqual({ action: "sign-in" });
  });

  it("treats the OAuth callback as public", () => {
    expect(
      decideMfaGate(input({ authenticated: false, path: "/auth/callback", currentLevel: null, nextLevel: null })),
    ).toEqual({ action: "allow" });
  });
});

describe("decideMfaGate — authenticated at aal2", () => {
  it("allows any protected path", () => {
    expect(decideMfaGate(input({ currentLevel: "aal2", nextLevel: "aal2" }))).toEqual({ action: "allow" });
  });
});

describe("decideMfaGate — authenticated below aal2", () => {
  it("routes a factorless session to enrol on a gated path", () => {
    expect(decideMfaGate(input({ currentLevel: "aal1", nextLevel: "aal1" }))).toEqual({ action: "enrol" });
  });

  it("routes a session with a verified factor to verify on a gated path", () => {
    expect(decideMfaGate(input({ currentLevel: "aal1", nextLevel: "aal2" }))).toEqual({ action: "verify" });
  });

  it("does NOT redirect on the enrol screen itself (no loop)", () => {
    expect(decideMfaGate(input({ path: "/mfa/enrol", currentLevel: "aal1", nextLevel: "aal1" }))).toEqual({
      action: "allow",
    });
  });

  it("does NOT redirect on the verify screen itself (no loop)", () => {
    expect(decideMfaGate(input({ path: "/sign-in/verify", currentLevel: "aal1", nextLevel: "aal2" }))).toEqual({
      action: "allow",
    });
  });

  it("does NOT redirect the enrol/verify API routes", () => {
    expect(decideMfaGate(input({ path: "/api/mfa/verify", currentLevel: "aal1", nextLevel: "aal2" }))).toEqual({
      action: "allow",
    });
    expect(decideMfaGate(input({ path: "/api/mfa/enrol", currentLevel: "aal1", nextLevel: "aal1" }))).toEqual({
      action: "allow",
    });
  });

  it("leaves a sub-aal2 session on a public path alone", () => {
    expect(decideMfaGate(input({ path: "/sign-in", currentLevel: "aal1", nextLevel: "aal1" }))).toEqual({
      action: "allow",
    });
  });

  it("skips MFA routing when the assurance level could not be read (RLS still protects data)", () => {
    expect(decideMfaGate(input({ currentLevel: null, nextLevel: null }))).toEqual({ action: "allow" });
  });
});
