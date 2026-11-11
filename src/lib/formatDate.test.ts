import { describe, it, expect } from "vitest";
import { formatDate, formatDateTime, formatDateTimeWithZone } from "./formatDate";

// These pin the zone to UTC so the assertions are stable regardless of where the test runs.
const UTC = { timeZone: "UTC" };

describe("formatDate", () => {
  it("renders day-month-year order (en-GB, Q-C-10)", () => {
    // 2026-04-03 is the 3rd of April; en-GB must show day first, not month (which would read as March).
    expect(formatDate("2026-04-03T00:00:00Z", UTC)).toBe("03/04/2026");
  });

  it("zero-pads single-digit day and month", () => {
    expect(formatDate("2026-01-05T00:00:00Z", UTC)).toBe("05/01/2026");
  });

  it.each([null, undefined, "", "not-a-date"])("returns empty string for invalid/absent value %p", (v) => {
    expect(formatDate(v as unknown as string, UTC)).toBe("");
  });

  it("accepts a Date and an epoch-ms number", () => {
    expect(formatDate(new Date("2026-12-31T00:00:00Z"), UTC)).toBe("31/12/2026");
    expect(formatDate(Date.UTC(2026, 11, 31), UTC)).toBe("31/12/2026");
  });
});

describe("formatDateTime", () => {
  it("adds 24-hour time after the date", () => {
    expect(formatDateTime("2026-04-03T14:05:00Z", UTC)).toBe("03/04/2026, 14:05");
  });

  it("uses 24-hour clock (no AM/PM)", () => {
    const out = formatDateTime("2026-04-03T23:30:00Z", UTC);
    expect(out).toContain("23:30");
    expect(out).not.toMatch(/[AP]M/i);
  });

  it("returns empty string for an invalid value", () => {
    expect(formatDateTime("nope", UTC)).toBe("");
  });
});

describe("formatDateTimeWithZone", () => {
  it("includes a zone name for detail views (Q-C-10)", () => {
    const out = formatDateTimeWithZone("2026-04-03T14:05:00Z", UTC);
    expect(out).toContain("03/04/2026");
    expect(out).toContain("14:05");
    // The short zone name for UTC is "UTC" (or "GMT" in some ICU builds); accept either.
    expect(out).toMatch(/UTC|GMT/);
  });

  it("returns empty string for an invalid value", () => {
    expect(formatDateTimeWithZone(null)).toBe("");
  });
});
