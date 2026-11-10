import { describe, expect, it } from "vitest";
import type { AdminRole, AdminStatus } from "@/lib/roles";
import {
  decidePublicOnly,
  decideRequireActive,
  decideRequireRole,
  decideRequireSession,
  decideRequireTerms,
} from "./decisions";

const ROLES: (AdminRole | null)[] = ["admin", "admin_manager", null];
const STATUSES: (AdminStatus | null)[] = ["invited", "active", "deactivated", null];

describe("decidePublicOnly", () => {
  it("allows an anonymous visitor and sends a signed-in admin into the app", () => {
    expect(decidePublicOnly({ authenticated: false })).toBe("allow");
    expect(decidePublicOnly({ authenticated: true })).toBe("to-app");
  });
});

describe("decideRequireSession", () => {
  it("requires a session", () => {
    expect(decideRequireSession({ authenticated: false })).toBe("sign-in");
    expect(decideRequireSession({ authenticated: true })).toBe("allow");
  });
});

describe("decideRequireActive — every status", () => {
  it("sends an anonymous visitor to sign-in regardless of status", () => {
    for (const status of STATUSES) {
      expect(decideRequireActive({ authenticated: false, status })).toBe("sign-in");
    }
  });
  it("allows an active admin", () => {
    expect(decideRequireActive({ authenticated: true, status: "active" })).toBe("allow");
  });
  it("blocks a deactivated admin", () => {
    expect(decideRequireActive({ authenticated: true, status: "deactivated" })).toBe("deactivated");
  });
  it("routes an invited admin to onboarding", () => {
    expect(decideRequireActive({ authenticated: true, status: "invited" })).toBe("onboarding");
  });
  it("fails open on an unreadable status (RLS still protects data)", () => {
    expect(decideRequireActive({ authenticated: true, status: null })).toBe("allow");
  });
});

describe("decideRequireRole — every role × the required role", () => {
  it("sends an anonymous visitor to sign-in for any required role", () => {
    for (const role of ROLES) {
      expect(decideRequireRole({ authenticated: false, role }, "admin_manager")).toBe("sign-in");
    }
  });

  it("allows only the exact required role, and forbids every other (incl. unknown)", () => {
    const required: AdminRole = "admin_manager";
    for (const role of ROLES) {
      const expected = role === required ? "allow" : "forbidden";
      expect(decideRequireRole({ authenticated: true, role }, required)).toBe(expected);
    }
  });

  it("works the same way for an admin-required route", () => {
    expect(decideRequireRole({ authenticated: true, role: "admin" }, "admin")).toBe("allow");
    expect(decideRequireRole({ authenticated: true, role: "admin_manager" }, "admin")).toBe("forbidden");
    expect(decideRequireRole({ authenticated: true, role: null }, "admin")).toBe("forbidden");
  });
});

describe("decideRequireTerms — inert slot (option A)", () => {
  it("allows when terms are accepted or unknown, routes only an explicit non-acceptance", () => {
    expect(decideRequireTerms({ termsAccepted: true })).toBe("allow");
    expect(decideRequireTerms({ termsAccepted: null })).toBe("allow");
    expect(decideRequireTerms({ termsAccepted: false })).toBe("terms");
  });
});

// A compact full matrix sanity check: a manager route decision for every status × role combination, proving
// role (not status) governs RequireRole and that the two guards compose without surprises.
describe("guard matrix — manager route (RequireActive then RequireRole:admin_manager)", () => {
  it("only an active admin_manager is fully allowed", () => {
    for (const status of STATUSES) {
      for (const role of ROLES) {
        const active = decideRequireActive({ authenticated: true, status });
        const roleDecision = decideRequireRole({ authenticated: true, role }, "admin_manager");
        const fullyAllowed = active === "allow" && roleDecision === "allow";
        const expected = (status === "active" || status === null) && role === "admin_manager";
        expect(fullyAllowed).toBe(expected);
      }
    }
  });
});
