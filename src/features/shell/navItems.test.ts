import { describe, expect, it } from "vitest";
import { filterNavForRole, NAV, navLabelByHref } from "./navItems";

describe("filterNavForRole — manager nav hidden for Administrators", () => {
  it("shows Admin management to an administrator manager", () => {
    const labels = filterNavForRole("admin_manager").map((n) => n.label);
    expect(labels).toContain("Admin management");
  });

  it("hides Admin management from an administrator", () => {
    const labels = filterNavForRole("admin").map((n) => n.label);
    expect(labels).not.toContain("Admin management");
  });

  it("hides Admin management from an unknown role too (fail closed)", () => {
    const labels = filterNavForRole(null).map((n) => n.label);
    expect(labels).not.toContain("Admin management");
  });

  it("keeps every non-manager entry for every role", () => {
    for (const role of ["admin", "admin_manager", null] as const) {
      const labels = filterNavForRole(role).map((n) => n.label);
      expect(labels).toEqual(expect.arrayContaining(["Dashboard", "Records", "Workflow", "Settings"]));
    }
  });
});

describe("navLabelByHref", () => {
  it("maps every leaf and item href to its label", () => {
    const map = navLabelByHref();
    expect(map.get("/")).toBe("Dashboard");
    expect(map.get("/politicians")).toBe("Politicians");
    expect(map.get("/review")).toBe("Review");
    expect(map.get("/admins")).toBe("Admin management");
    expect(map.get("/settings")).toBe("Settings");
  });
});

describe("NAV shape", () => {
  it("marks only Admin management as manager-only", () => {
    const managerItems = NAV.filter((n) => n.kind === "item" && n.managerOnly).map((n) => n.label);
    expect(managerItems).toEqual(["Admin management"]);
  });
});
