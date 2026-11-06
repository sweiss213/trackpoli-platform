import { describe, expect, it, vi } from "vitest";
import {
  completePasswordReset,
  type CompleteResetPorts,
  performPasswordReset,
  PASSWORD_RESET_TIMING_FLOOR_MS,
  ResetBlocked,
  type RequestResetPorts,
} from "./passwordReset";

const REQUEST_INPUT = { email: "abe@example.test", turnstileToken: "tok", ip: "1.2.3.4" };

// Fake request ports with a controllable clock. By default now() stays at 0, so padding is exercised.
function makeRequestPorts(
  over: Partial<RequestResetPorts> & { clock?: number[] } = {},
): RequestResetPorts & { sleepMock: ReturnType<typeof vi.fn>; requestMock: ReturnType<typeof vi.fn> } {
  const clock = over.clock ?? [0, 0];
  let i = 0;
  const sleepMock = vi.fn(async () => undefined);
  const requestMock = vi.fn(async () => undefined);
  return {
    requestReset: over.requestReset ?? requestMock,
    now: over.now ?? (() => clock[Math.min(i++, clock.length - 1)]),
    sleep: over.sleep ?? sleepMock,
    sleepMock,
    requestMock,
  };
}

describe("performPasswordReset", () => {
  it("returns a padded 'sent' outcome when the request succeeds", async () => {
    const ports = makeRequestPorts();
    const result = await performPasswordReset(REQUEST_INPUT, ports);
    expect(result).toEqual({ outcome: "sent" });
    expect(ports.requestMock).toHaveBeenCalledWith({
      email: REQUEST_INPUT.email,
      turnstileToken: REQUEST_INPUT.turnstileToken,
      ip: REQUEST_INPUT.ip,
    });
    expect(ports.sleepMock).toHaveBeenCalledWith(PASSWORD_RESET_TIMING_FLOOR_MS);
  });

  it("is indistinguishable between a known and an unknown address", async () => {
    // The port returns the same for both (the Edge Function never signals which exists), so the two runs
    // must produce an identical outcome and both be padded to the floor.
    const known = await performPasswordReset(REQUEST_INPUT, makeRequestPorts());
    const unknown = await performPasswordReset(
      { ...REQUEST_INPUT, email: "nobody@example.test" },
      makeRequestPorts(),
    );
    expect(known).toEqual(unknown);
    expect(known).toEqual({ outcome: "sent" });
  });

  it("does not pad when the request already exceeded the timing floor", async () => {
    const ports = makeRequestPorts({ clock: [0, PASSWORD_RESET_TIMING_FLOOR_MS + 40] });
    await performPasswordReset(REQUEST_INPUT, ports);
    expect(ports.sleepMock).not.toHaveBeenCalled();
  });

  it("reports a failed bot check as a distinct, unpadded block", async () => {
    const ports = makeRequestPorts({
      requestReset: async () => {
        throw new ResetBlocked("turnstile");
      },
    });
    const result = await performPasswordReset(REQUEST_INPUT, ports);
    expect(result).toEqual({ outcome: "blocked", reason: "turnstile", retryAfterSeconds: undefined });
    expect(ports.sleepMock).not.toHaveBeenCalled();
  });

  it("passes a rate-limit block through with its retry hint", async () => {
    const ports = makeRequestPorts({
      requestReset: async () => {
        throw new ResetBlocked("rate_limited", 3600);
      },
    });
    const result = await performPasswordReset(REQUEST_INPUT, ports);
    expect(result).toEqual({ outcome: "blocked", reason: "rate_limited", retryAfterSeconds: 3600 });
  });

  it("lets an unexpected (non-account) failure surface rather than masking it as sent", async () => {
    const ports = makeRequestPorts({
      requestReset: async () => {
        throw new Error("turnstile verifier unreachable");
      },
    });
    await expect(performPasswordReset(REQUEST_INPUT, ports)).rejects.toThrow("unreachable");
  });
});

const USER = { id: "user-1", email: "abe@example.test" };

function makeCompletePorts(over: Partial<CompleteResetPorts> = {}): CompleteResetPorts & {
  onResetMock: ReturnType<typeof vi.fn>;
  signOutMock: ReturnType<typeof vi.fn>;
  updateMock: ReturnType<typeof vi.fn>;
} {
  const onResetMock = vi.fn(async () => undefined);
  const signOutMock = vi.fn(async () => undefined);
  const updateMock = vi.fn(async () => ({ ok: true }));
  return {
    getRecoveryUser: over.getRecoveryUser ?? (async () => USER),
    updatePassword: over.updatePassword ?? updateMock,
    onReset: over.onReset ?? onResetMock,
    signOutEverywhere: over.signOutEverywhere ?? signOutMock,
    onResetMock,
    signOutMock,
    updateMock,
  };
}

const COMPLETE_INPUT = { password: "a-strong-passphrase", ip: "1.2.3.4", requestId: "req-1" };

describe("completePasswordReset", () => {
  it("updates the password, ends all sessions, then does the lockout/event bookkeeping", async () => {
    const ports = makeCompletePorts();
    const result = await completePasswordReset(COMPLETE_INPUT, ports);
    expect(result).toEqual({ outcome: "done" });
    expect(ports.updateMock).toHaveBeenCalledWith(COMPLETE_INPUT.password);
    expect(ports.onResetMock).toHaveBeenCalledWith(USER, COMPLETE_INPUT.ip, COMPLETE_INPUT.requestId);
    expect(ports.signOutMock).toHaveBeenCalled();
    // Sessions are revoked BEFORE the audit bookkeeping, so an onReset failure cannot drop the revocation
    // guarantee (judge-arch finding, ADR-0008).
    expect(ports.signOutMock.mock.invocationCallOrder[0]).toBeLessThan(
      ports.onResetMock.mock.invocationCallOrder[0],
    );
  });

  it("returns no_session and changes nothing when there is no recovery session", async () => {
    const ports = makeCompletePorts({ getRecoveryUser: async () => null });
    const result = await completePasswordReset(COMPLETE_INPUT, ports);
    expect(result).toEqual({ outcome: "no_session" });
    expect(ports.updateMock).not.toHaveBeenCalled();
    expect(ports.onResetMock).not.toHaveBeenCalled();
    expect(ports.signOutMock).not.toHaveBeenCalled();
  });

  it("returns weak_password and does not clear lockout or sign out when the password is rejected", async () => {
    const ports = makeCompletePorts({ updatePassword: async () => ({ ok: false }) });
    const result = await completePasswordReset(COMPLETE_INPUT, ports);
    expect(result).toEqual({ outcome: "weak_password" });
    expect(ports.onResetMock).not.toHaveBeenCalled();
    expect(ports.signOutMock).not.toHaveBeenCalled();
  });
});
