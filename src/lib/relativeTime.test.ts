import { afterEach, describe, expect, it, vi } from "vitest";
import { formatTimeUntil } from "./relativeTime";

describe("formatTimeUntil", () => {
  afterEach(() => vi.useRealTimers());

  function at(now: string) {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
  }

  it("returns 'shortly' for null, unparseable, or past times", () => {
    at("2026-11-05T12:00:00Z");
    expect(formatTimeUntil(null)).toBe("shortly");
    expect(formatTimeUntil("not-a-date")).toBe("shortly");
    expect(formatTimeUntil("2026-11-05T11:59:59Z")).toBe("shortly"); // already past
    expect(formatTimeUntil("2026-11-05T12:00:00Z")).toBe("shortly"); // exactly now (ms <= 0)
  });

  it("rounds minutes up and singularises one minute", () => {
    at("2026-11-05T12:00:00Z");
    expect(formatTimeUntil("2026-11-05T12:00:30Z")).toBe("in 1 minute"); // 30s -> ceil 1
    expect(formatTimeUntil("2026-11-05T12:14:01Z")).toBe("in 15 minutes"); // 14m1s -> ceil 15
  });

  it("switches to hours at 60 minutes and rounds up", () => {
    at("2026-11-05T12:00:00Z");
    expect(formatTimeUntil("2026-11-05T13:00:00Z")).toBe("in 1 hour"); // 60m -> 1h
    expect(formatTimeUntil("2026-11-05T15:30:00Z")).toBe("in 4 hours"); // 210m -> ceil 4h
  });
});
