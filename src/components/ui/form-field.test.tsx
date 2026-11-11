import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { FormField } from "@/components/ui/form-field";

describe("FormField", () => {
  it("associates the visible label with the input (programmatic label)", () => {
    render(<FormField label="Email address" />);
    const input = screen.getByLabelText("Email address");
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe("INPUT");
  });

  it("links the hint to the input via aria-describedby and shows it", () => {
    render(<FormField label="Email" hint="We never share it." />);
    const input = screen.getByLabelText("Email");
    const hint = screen.getByText("We never share it.");
    expect(input.getAttribute("aria-describedby")).toContain(hint.id);
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("marks the field invalid and links the error message when error is set", () => {
    render(<FormField label="Email" error="Enter a valid email address" />);
    const input = screen.getByLabelText("Email");
    const error = screen.getByText("Enter a valid email address");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toContain(error.id);
  });

  it("shows the error instead of the hint when both are provided", () => {
    render(<FormField label="Email" hint="Optional hint" error="Required" />);
    expect(screen.queryByText("Optional hint")).not.toBeInTheDocument();
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("forwards input props (type, value, autocomplete)", () => {
    render(<FormField label="Email" type="email" autoComplete="username" defaultValue="a@b.com" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("type", "email");
    expect(input).toHaveAttribute("autocomplete", "username");
    expect(input).toHaveValue("a@b.com");
  });
});
