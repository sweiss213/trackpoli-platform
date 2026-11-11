import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { StatusTag } from "@/components/ui/status-tag";

describe("StatusTag", () => {
  it("renders the status word as text (never colour-only)", () => {
    render(<StatusTag status="active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it.each([
    ["active", "Active"],
    ["invited", "Invited"],
    ["deactivated", "Deactivated"],
  ] as const)("labels %s as %s", (status, label) => {
    render(<StatusTag status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("distinguishes the non-active states by border style, not colour alone (WCAG 1.4.1)", () => {
    const { rerender } = render(<StatusTag status="invited" data-testid="tag" />);
    // Invited: solid border; Deactivated: dashed border — a non-colour difference.
    expect(screen.getByTestId("tag").className).toContain("border");
    expect(screen.getByTestId("tag").className).not.toContain("border-dashed");

    rerender(<StatusTag status="deactivated" data-testid="tag" />);
    expect(screen.getByTestId("tag").className).toContain("border-dashed");
  });

  it("exposes the status as a data attribute for styling/testing", () => {
    render(<StatusTag status="active" data-testid="tag" />);
    expect(screen.getByTestId("tag")).toHaveAttribute("data-status", "active");
  });
});
