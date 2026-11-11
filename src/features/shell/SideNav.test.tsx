import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthState } from "@/features/auth/AuthProvider";
import { useAuth } from "@/features/auth/useAuth";
import { SideNav } from "./SideNav";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/settings" }));
vi.mock("@/features/auth/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/apiFetch", () => ({ apiFetch: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/report", () => ({ report: vi.fn() }));

const mockUseAuth = vi.mocked(useAuth);

// Shell design-system migration (TP1-06 -> shadcn): the collapse toggle, the section headers and Log out
// were raw <button>s; they are now the shadcn Button. They must stay native <button>s with the same
// accessible names and aria state, and the nav <Link>s must stay basePath-relative (ADR-0014 - Next adds
// the /admin basePath, so a literal /admin would double-prefix).
//
// TP1-07: the rail collapse is CONTROLLED by AppShell — SideNav renders the collapse button only when an
// onToggleCollapsed handler is passed, its label/aria-pressed reflect the `collapsed` prop, and a click
// calls the handler (the parent owns the state). The section open/close is SideNav's own local state.
describe("SideNav - shell shadcn migration parity", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: "u", email: "ada@example.test", role: "admin_manager", status: "active" },
      isAuthenticated: true,
    } as AuthState);
  });

  it("keeps the collapse, section and log-out controls as native <button>s with their names and aria state", () => {
    render(<SideNav displayName="Ada Admin" onToggleCollapsed={() => {}} />);
    const collapse = screen.getByRole("button", { name: "Collapse navigation" });
    expect(collapse.tagName).toBe("BUTTON");
    expect(collapse).toHaveAttribute("aria-pressed", "false");

    const records = screen.getByRole("button", { name: "Records" });
    expect(records.tagName).toBe("BUTTON");
    expect(records).toHaveAttribute("aria-expanded", "true");

    const logout = screen.getByRole("button", { name: "Log out" });
    expect(logout.tagName).toBe("BUTTON");
  });

  it("calls onToggleCollapsed when the controlled collapse button is clicked", () => {
    const onToggleCollapsed = vi.fn();
    render(<SideNav displayName="Ada Admin" onToggleCollapsed={onToggleCollapsed} />);
    fireEvent.click(screen.getByRole("button", { name: "Collapse navigation" }));
    expect(onToggleCollapsed).toHaveBeenCalledTimes(1);
  });

  it("reflects the collapsed prop on the rail button (label + aria-pressed)", () => {
    render(<SideNav displayName="Ada Admin" collapsed onToggleCollapsed={() => {}} />);
    const collapse = screen.getByRole("button", { name: "Expand navigation" });
    expect(collapse).toHaveAttribute("aria-pressed", "true");
  });

  it("toggles a section's local open state (aria-expanded)", () => {
    render(<SideNav displayName="Ada Admin" onToggleCollapsed={() => {}} />);
    const records = screen.getByRole("button", { name: "Records" });
    expect(records).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(records);
    expect(records).toHaveAttribute("aria-expanded", "false");
  });

  it("renders nav links with basePath-relative hrefs (no literal /admin/admin)", () => {
    render(<SideNav displayName="Ada Admin" />);
    const settings = screen.getByRole("link", { name: "Settings" });
    expect(settings.getAttribute("href") ?? "").not.toContain("/admin/admin");
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    // The manager-only entry is visible to a manager.
    expect(screen.getByRole("link", { name: "Admin management" })).toBeInTheDocument();
  });
});
