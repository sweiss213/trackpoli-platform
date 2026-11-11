import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { NavItem } from "@/features/shell/NavItem";

describe("NavItem", () => {
  it("passes the app-relative href straight to next/link (basePath adds /admin at runtime, ADR-0014)", () => {
    render(<NavItem href="/politicians" label="Politicians" />);
    const link = screen.getByRole("link", { name: "Politicians" });
    // App-relative, never a literal /admin here: Next adds the basePath, so a prefix would double to
    // /admin/admin/politicians (404). In jsdom there is no basePath, so the raw href renders as-is.
    expect(link).toHaveAttribute("href", "/politicians");
    expect(link.getAttribute("href") ?? "").not.toContain("/admin/admin");
  });

  it("marks the active item with aria-current=page", () => {
    render(<NavItem href="/politicians" label="Politicians" active />);
    expect(screen.getByRole("link", { name: "Politicians" })).toHaveAttribute("aria-current", "page");
  });

  it("does not set aria-current when inactive", () => {
    render(<NavItem href="/politicians" label="Politicians" />);
    expect(screen.getByRole("link", { name: "Politicians" })).not.toHaveAttribute("aria-current");
  });

  it("shows a badge count when provided", () => {
    render(<NavItem href="/review" label="Review" badge={12} />);
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("hides the visible label (icon-only) but keeps it as the accessible name when collapsed", () => {
    render(<NavItem href="/" label="Dashboard" collapsed icon={<svg data-testid="i" />} />);
    // No visible text label, but the link still has an accessible name via aria-label (not just title).
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Dashboard" });
    expect(link).toHaveAttribute("aria-label", "Dashboard");
    expect(screen.getByTestId("i")).toBeInTheDocument();
  });

  it("is keyboard-operable: a native focusable anchor with an href, kept in the tab order", () => {
    render(<NavItem href="/politicians" label="Politicians" />);
    const link = screen.getByRole("link", { name: "Politicians" });
    // A native anchor with an href is operated by Enter from the keyboard; it must stay in the tab order
    // (no tabindex="-1") and be able to receive focus.
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/politicians");
    expect(link).not.toHaveAttribute("tabindex", "-1");
    link.focus();
    expect(link).toHaveFocus();
  });
});
