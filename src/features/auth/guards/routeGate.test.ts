import { describe, expect, it } from "vitest";
import type { AdminRole } from "@/lib/roles";
import { decideRoleGate, isManagerOnlyPath, type RoleGateInput } from "./routeGate";

function input(over: Partial<RoleGateInput> = {}): RoleGateInput {
  return { path: "/admins", authenticated: true, role: "admin_manager", ...over };
}

describe("decideRoleGate", () => {
  it("allows an administrator manager onto a manager-only path", () => {
    expect(decideRoleGate(input({ role: "admin_manager" }))).toEqual({ action: "allow" });
  });

  it("forbids an administrator on a manager-only path", () => {
    expect(decideRoleGate(input({ role: "admin" }))).toEqual({ action: "forbidden" });
  });

  it("forbids an unreadable role on a manager-only path (fail closed)", () => {
    expect(decideRoleGate(input({ role: null }))).toEqual({ action: "forbidden" });
  });

  it("covers a manager sub-path", () => {
    expect(decideRoleGate(input({ path: "/admins/new", role: "admin" }))).toEqual({ action: "forbidden" });
    expect(decideRoleGate(input({ path: "/admins/new", role: "admin_manager" }))).toEqual({ action: "allow" });
  });

  it("allows any role on a non-manager path", () => {
    for (const role of ["admin", "admin_manager", null] as (AdminRole | null)[]) {
      expect(decideRoleGate(input({ path: "/politicians", role }))).toEqual({ action: "allow" });
    }
  });

  it("leaves an unauthenticated request to the sign-in guard", () => {
    expect(decideRoleGate(input({ authenticated: false, role: null }))).toEqual({ action: "allow" });
  });
});

describe("isManagerOnlyPath", () => {
  it("recognises the manager paths and nothing else", () => {
    expect(isManagerOnlyPath("/admins")).toBe(true);
    expect(isManagerOnlyPath("/admins/123")).toBe(true);
    expect(isManagerOnlyPath("/politicians")).toBe(false);
    expect(isManagerOnlyPath("/settings/security")).toBe(false);
  });
});
