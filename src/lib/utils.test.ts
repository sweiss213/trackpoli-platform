import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins truthy class names in order", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, null, undefined, 0 as unknown as string, "b")).toBe("a b");
  });

  it("resolves the conditional object form", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active");
  });

  it("flattens arrays of class values", () => {
    expect(cn(["a", "b"], "c")).toBe("a b c");
  });

  it("collapses conflicting Tailwind utilities so the last one wins", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-foreground", "text-background")).toBe("text-background");
  });

  it("returns an empty string for no input", () => {
    expect(cn()).toBe("");
  });
});
