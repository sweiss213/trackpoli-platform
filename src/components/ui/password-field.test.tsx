import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { PasswordField } from "@/components/ui/password-field";

describe("PasswordField", () => {
  it("renders a labelled password field, hidden by default", () => {
    render(<PasswordField label="Password" autoComplete="current-password" />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveAttribute("autocomplete", "current-password");
  });

  it("exposes a native toggle button with an accessible name and aria-pressed=false", () => {
    render(<PasswordField label="Password" />);
    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle.tagName).toBe("BUTTON");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("reveals the password and updates the toggle state when activated", () => {
    render(<PasswordField label="Password" />);
    const toggle = screen.getByRole("button", { name: "Show password" });
    fireEvent.click(toggle);

    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    const pressed = screen.getByRole("button", { name: "Hide password" });
    expect(pressed).toHaveAttribute("aria-pressed", "true");
  });

  it("hides the password again on a second activation", () => {
    render(<PasswordField label="Password" />);
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("propagates the field error and keeps the toggle usable", () => {
    render(<PasswordField label="Password" error="Password is required" />);
    expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show password" })).toBeEnabled();
  });
});
