import { describe, expect, it, vi } from "vitest";
import {
  authorizeReplacement,
  beginEnrolment,
  completeReplacement,
  confirmEnrolment,
  type EnrolStart,
  type MfaPorts,
  type ReplacePorts,
  verifySignInChallenge,
} from "./mfa";

const ENROL: EnrolStart = {
  factorId: "factor-new",
  qrCode: "data:image/svg+xml;base64,QR",
  secret: "ABCDEF",
  uri: "otpauth://totp/TrackPoli:abe?secret=ABCDEF",
};

function makeMfaPorts(over: Partial<MfaPorts> = {}): MfaPorts & {
  enrollMock: ReturnType<typeof vi.fn>;
  verifyMock: ReturnType<typeof vi.fn>;
  listMock: ReturnType<typeof vi.fn>;
  unenrollMock: ReturnType<typeof vi.fn>;
} {
  const enrollMock = vi.fn(async () => ENROL);
  const verifyMock = vi.fn(async () => "ok" as const);
  const listMock = vi.fn(async () => ["factor-old"]);
  const unenrollMock = vi.fn(async () => undefined);
  return {
    enroll: over.enroll ?? enrollMock,
    verifyFactor: over.verifyFactor ?? verifyMock,
    listVerifiedFactorIds: over.listVerifiedFactorIds ?? listMock,
    unenroll: over.unenroll ?? unenrollMock,
    enrollMock,
    verifyMock,
    listMock,
    unenrollMock,
  };
}

describe("beginEnrolment", () => {
  it("returns the new factor's QR/secret/URI from the port", async () => {
    const ports = makeMfaPorts();
    await expect(beginEnrolment(ports)).resolves.toEqual(ENROL);
  });
});

describe("confirmEnrolment", () => {
  it("is enrolled when the code verifies", async () => {
    const ports = makeMfaPorts({ verifyFactor: async () => "ok" as const });
    const result = await confirmEnrolment({ factorId: "factor-new", code: "123456" }, ports);
    expect(result).toEqual({ outcome: "enrolled" });
  });

  it("is invalid_code when the code does not verify", async () => {
    const ports = makeMfaPorts({ verifyFactor: async () => "invalid" as const });
    const result = await confirmEnrolment({ factorId: "factor-new", code: "000000" }, ports);
    expect(result).toEqual({ outcome: "invalid_code" });
  });

  it("is too_many_attempts when the factor verify is rate-limited", async () => {
    const ports = makeMfaPorts({ verifyFactor: async () => "rate_limited" as const });
    const result = await confirmEnrolment({ factorId: "factor-new", code: "000000" }, ports);
    expect(result).toEqual({ outcome: "too_many_attempts" });
  });
});

describe("verifySignInChallenge", () => {
  it("verifies against the existing factor and lifts to aal2", async () => {
    const ports = makeMfaPorts({ listVerifiedFactorIds: async () => ["factor-old"] });
    const result = await verifySignInChallenge({ code: "123456" }, ports);
    expect(result).toEqual({ outcome: "verified" });
    expect(ports.verifyMock).toHaveBeenCalledWith("factor-old", "123456");
  });

  it("is invalid_code when the code is wrong", async () => {
    const ports = makeMfaPorts({ verifyFactor: async () => "invalid" as const });
    const result = await verifySignInChallenge({ code: "000000" }, ports);
    expect(result).toEqual({ outcome: "invalid_code" });
  });

  it("is no_factor when the session has no verified factor (a routing miss, not a code error)", async () => {
    const ports = makeMfaPorts({ listVerifiedFactorIds: async () => [] });
    const result = await verifySignInChallenge({ code: "123456" }, ports);
    expect(result).toEqual({ outcome: "no_factor" });
    expect(ports.verifyMock).not.toHaveBeenCalled();
  });
});

function makeReplacePorts(over: Partial<ReplacePorts> = {}): ReplacePorts & {
  reauthMock: ReturnType<typeof vi.fn>;
  enrollMock: ReturnType<typeof vi.fn>;
  verifyMock: ReturnType<typeof vi.fn>;
  listMock: ReturnType<typeof vi.fn>;
} {
  const reauthMock = vi.fn(async () => true);
  const enrollMock = vi.fn(async () => ENROL);
  const verifyMock = vi.fn(async () => "ok" as const);
  const listMock = vi.fn(async () => ["factor-old"]);
  return {
    reauthenticate: over.reauthenticate ?? reauthMock,
    enroll: over.enroll ?? enrollMock,
    verifyFactor: over.verifyFactor ?? verifyMock,
    listVerifiedFactorIds: over.listVerifiedFactorIds ?? listMock,
    unenroll: over.unenroll ?? (async () => undefined),
    reauthMock,
    enrollMock,
    verifyMock,
    listMock,
  };
}

describe("authorizeReplacement", () => {
  it("re-authenticates and proves the current device before enrolling a new one", async () => {
    const ports = makeReplacePorts();
    const result = await authorizeReplacement(
      { proof: { kind: "password", password: "pw" }, currentCode: "123456" },
      ports,
    );
    expect(result).toEqual({ outcome: "authorized", enrol: ENROL });
    // Re-auth happens first; the session alone is never trusted (ADR-0009).
    expect(ports.reauthMock.mock.invocationCallOrder[0]).toBeLessThan(
      ports.verifyMock.mock.invocationCallOrder[0],
    );
    expect(ports.verifyMock.mock.invocationCallOrder[0]).toBeLessThan(
      ports.enrollMock.mock.invocationCallOrder[0],
    );
  });

  it("stops at reauth_failed and touches no factor when re-auth fails", async () => {
    const ports = makeReplacePorts({ reauthenticate: async () => false });
    const result = await authorizeReplacement(
      { proof: { kind: "google", verified: false }, currentCode: "123456" },
      ports,
    );
    expect(result).toEqual({ outcome: "reauth_failed" });
    expect(ports.verifyMock).not.toHaveBeenCalled();
    expect(ports.enrollMock).not.toHaveBeenCalled();
  });

  it("is invalid_current_code when the current device code is wrong, and enrols nothing", async () => {
    const ports = makeReplacePorts({ verifyFactor: async () => "invalid" as const });
    const result = await authorizeReplacement(
      { proof: { kind: "password", password: "pw" }, currentCode: "000000" },
      ports,
    );
    expect(result).toEqual({ outcome: "invalid_current_code" });
    expect(ports.enrollMock).not.toHaveBeenCalled();
  });

  it("is no_factor when there is no current verified factor", async () => {
    const ports = makeReplacePorts({ listVerifiedFactorIds: async () => [] });
    const result = await authorizeReplacement(
      { proof: { kind: "password", password: "pw" }, currentCode: "123456" },
      ports,
    );
    expect(result).toEqual({ outcome: "no_factor" });
  });
});

describe("completeReplacement", () => {
  it("verifies the new device, then drops every other factor so exactly one remains", async () => {
    const unenroll = vi.fn(async () => undefined);
    const ports = makeMfaPorts({
      verifyFactor: async () => "ok" as const,
      listVerifiedFactorIds: async () => ["factor-old", "factor-new"],
      unenroll,
    });
    const result = await completeReplacement({ newFactorId: "factor-new", newCode: "123456" }, ports);
    expect(result).toEqual({ outcome: "replaced" });
    // Only the stale factor is removed; the just-verified new one is kept.
    expect(unenroll).toHaveBeenCalledWith("factor-old");
    expect(unenroll).not.toHaveBeenCalledWith("factor-new");
  });

  it("is invalid_new_code when the new device code is wrong and cleans up the orphan factor", async () => {
    const unenroll = vi.fn(async () => undefined);
    const ports = makeMfaPorts({ verifyFactor: async () => "invalid" as const, unenroll });
    const result = await completeReplacement({ newFactorId: "factor-new", newCode: "000000" }, ports);
    expect(result).toEqual({ outcome: "invalid_new_code" });
    expect(unenroll).toHaveBeenCalledWith("factor-new");
  });

  it("still returns replaced when the old factor can't be removed — the new device already works (F1)", async () => {
    // Removing the stale factor is best-effort once the new one is verified; a failure must not masquerade
    // as "nothing changed" while the user's new device is already active (judge-arch F1).
    const ports = makeMfaPorts({
      verifyFactor: async () => "ok" as const,
      listVerifiedFactorIds: async () => ["factor-old", "factor-new"],
      unenroll: async () => {
        throw new Error("supabase unavailable");
      },
    });
    const result = await completeReplacement({ newFactorId: "factor-new", newCode: "123456" }, ports);
    expect(result).toEqual({ outcome: "replaced" });
  });
});
