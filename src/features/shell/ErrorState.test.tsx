import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorState } from "./ErrorState";
import forbiddenIcon from "./assets/forbidden.svg";

// Shell design-system migration (TP1-06 -> shadcn): the error-state action that has an onClick (no href)
// must render as the shadcn Button (a native <button>) with its label and click behaviour; the href action
// stays a next/link. Parity with the pre-migration raw <button>.
describe("ErrorState - shell shadcn migration parity", () => {
  it("renders an onClick action as a native shadcn <button> that fires", () => {
    const onClick = vi.fn();
    render(
      <ErrorState icon={forbiddenIcon} title="No access" body="b" code="403" primary={{ label: "Try again", onClick }} />,
    );
    const btn = screen.getByRole("button", { name: "Try again" });
    expect(btn.tagName).toBe("BUTTON");
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders an href action as a link, not a button (basePath-relative, ADR-0014)", () => {
    render(
      <ErrorState
        icon={forbiddenIcon}
        title="No access"
        body="b"
        code="403"
        primary={{ label: "Back to dashboard", href: "/" }}
        secondary={{ label: "Settings", href: "/settings" }}
      />,
    );
    const link = screen.getByRole("link", { name: "Back to dashboard" });
    expect(link.tagName).toBe("A");
    // The href is basePath-relative (passed through to next/link); never the doubled /admin/admin.
    expect(link.getAttribute("href") ?? "").not.toContain("/admin/admin");
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
  });
});
