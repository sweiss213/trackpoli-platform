import { describe, expect, it, vi } from "vitest";
import {
  performSignIn,
  SignInBlocked,
  SIGN_IN_TIMING_FLOOR_MS,
  type SignInPorts,
} from "./signIn";

const INPUT = { email: "abe@example.test", password: "x".repeat(12), turnstileToken: "tok", ip: "1.2.3.4" };
const LOCKED_UNTIL = "2026-11-05T10:15:00.000Z";

// Fake ports with a controllable clock. By default now() stays at 0, so the failure padding is exercised.
function makePorts(over: Partial<SignInPorts> & { clock?: number[] } = {}): SignInPorts & {
  sleepMock: ReturnType<typeof vi.fn>;
  recordFailureMock: ReturnType<typeof vi.fn>;
  attemptMock: ReturnType<typeof vi.fn>;
} {
  const clock = over.clock ?? [0, 0];
  let i = 0;
  const sleepMock = vi.fn(async () => undefined);
  const recordFailureMock = vi.fn(async () => ({ locked: false, lockedUntil: null, attemptsRemaining: 2 }));
  const attemptMock = vi.fn(async () => false);
  return {
    checkSignIn: over.checkSignIn ?? (async () => ({ allowed: true, lockedUntil: null })),
    attemptPassword: over.attemptPassword ?? attemptMock,
    recordFailure: over.recordFailure ?? recordFailureMock,
    now: over.now ?? (() => clock[Math.min(i++, clock.length - 1)]),
    sleep: over.sleep ?? sleepMock,
    sleepMock,
    recordFailureMock,
    attemptMock,
  };
}

describe("performSignIn", () => {
  it("returns a padded locked outcome for a paused account and never checks the password", async () => {
    const ports = makePorts({ checkSignIn: async () => ({ allowed: false, lockedUntil: LOCKED_UNTIL }) });
    const result = await performSignIn(INPUT, ports);
    expect(result).toEqual({ outcome: "locked", lockedUntil: LOCKED_UNTIL });
    expect(ports.attemptMock).not.toHaveBeenCalled();
    expect(ports.sleepMock).toHaveBeenCalledWith(SIGN_IN_TIMING_FLOOR_MS);
  });

  it("returns a padded generic failure with the remaining count for a wrong password", async () => {
    const ports = makePorts({ attemptPassword: async () => false });
    const result = await performSignIn(INPUT, ports);
    expect(result).toEqual({ outcome: "failed", attemptsRemaining: 2 });
    expect(ports.recordFailureMock).toHaveBeenCalledWith({ email: INPUT.email, ip: INPUT.ip });
    expect(ports.sleepMock).toHaveBeenCalledWith(SIGN_IN_TIMING_FLOOR_MS);
  });

  it("returns locked when the attempt that fails is the one that trips the lock", async () => {
    const ports = makePorts({
      attemptPassword: async () => false,
      recordFailure: async () => ({ locked: true, lockedUntil: LOCKED_UNTIL, attemptsRemaining: null }),
    });
    const result = await performSignIn(INPUT, ports);
    expect(result).toEqual({ outcome: "locked", lockedUntil: LOCKED_UNTIL });
    expect(ports.sleepMock).toHaveBeenCalledWith(SIGN_IN_TIMING_FLOOR_MS);
  });

  it("is indistinguishable between an unknown email and a wrong password", async () => {
    const unknown = await performSignIn(INPUT, makePorts({ attemptPassword: async () => false }));
    const wrong = await performSignIn(INPUT, makePorts({ attemptPassword: async () => false }));
    expect(unknown).toEqual(wrong); // same outcome and same remaining count
  });

  it("succeeds without padding or recording a failure when the password is correct", async () => {
    const ports = makePorts({ attemptPassword: async () => true });
    const result = await performSignIn(INPUT, ports);
    expect(result).toEqual({ outcome: "success" });
    expect(ports.recordFailureMock).not.toHaveBeenCalled();
    expect(ports.sleepMock).not.toHaveBeenCalled();
  });

  it("does not pad when the failure path already exceeded the timing floor", async () => {
    const ports = makePorts({
      checkSignIn: async () => ({ allowed: false, lockedUntil: LOCKED_UNTIL }),
      clock: [0, SIGN_IN_TIMING_FLOOR_MS + 50],
    });
    await performSignIn(INPUT, ports);
    expect(ports.sleepMock).not.toHaveBeenCalled();
  });

  it("reports a failed bot check as a distinct, unpadded block", async () => {
    const ports = makePorts({
      checkSignIn: async () => {
        throw new SignInBlocked("turnstile");
      },
    });
    const result = await performSignIn(INPUT, ports);
    expect(result).toEqual({ outcome: "blocked", reason: "turnstile", retryAfterSeconds: undefined });
    expect(ports.sleepMock).not.toHaveBeenCalled();
  });

  it("passes a rate-limit block through with its retry hint", async () => {
    const ports = makePorts({
      checkSignIn: async () => {
        throw new SignInBlocked("rate_limited", 60);
      },
    });
    const result = await performSignIn(INPUT, ports);
    expect(result).toEqual({ outcome: "blocked", reason: "rate_limited", retryAfterSeconds: 60 });
  });
});
