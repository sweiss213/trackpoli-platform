import { describe, it, expect } from "vitest";
import { requireEnv, isAbsoluteHttpUrl } from "./env";

describe("requireEnv", () => {
  it("returns the value when present", () => {
    expect(requireEnv("X", "value")).toBe("value");
  });
  it("throws when undefined", () => {
    expect(() => requireEnv("X", undefined)).toThrow(/Missing required environment variable: X/);
  });
  it("throws when blank", () => {
    expect(() => requireEnv("X", "   ")).toThrow(/Missing required environment variable: X/);
  });
});

describe("isAbsoluteHttpUrl", () => {
  it("accepts http and https URLs", () => {
    expect(isAbsoluteHttpUrl("https://example.test/admin")).toBe(true);
    expect(isAbsoluteHttpUrl("http://localhost:3000/admin")).toBe(true);
  });
  it("rejects relative paths and other schemes", () => {
    expect(isAbsoluteHttpUrl("/admin")).toBe(false);
    expect(isAbsoluteHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isAbsoluteHttpUrl("not a url")).toBe(false);
  });
});
