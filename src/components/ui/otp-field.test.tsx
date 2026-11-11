import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { OtpField } from "@/components/ui/otp-field";

describe("OtpField", () => {
  it("renders a single labelled numeric one-time-code input", () => {
    render(<OtpField label="Verification code" value="" onValueChange={() => {}} />);
    const input = screen.getByLabelText("Verification code");
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("autocomplete", "one-time-code");
    expect(input).toHaveAttribute("maxlength", "6");
  });

  it("strips non-digits and caps at the length on change", () => {
    const onValueChange = vi.fn();
    render(<OtpField label="Code" value="" onValueChange={onValueChange} />);
    fireEvent.change(screen.getByLabelText("Code"), { target: { value: "12ab34" } });
    expect(onValueChange).toHaveBeenLastCalledWith("1234");
  });

  it("accepts a pasted whole code, keeping only the first N digits", () => {
    const onValueChange = vi.fn();
    render(<OtpField label="Code" value="" onValueChange={onValueChange} />);
    // A paste surfaces as a change event with the full string; it is filtered and capped to 6.
    fireEvent.change(screen.getByLabelText("Code"), { target: { value: "123456789" } });
    expect(onValueChange).toHaveBeenLastCalledWith("123456");
  });

  it("supports a custom length", () => {
    render(<OtpField label="Code" value="" onValueChange={() => {}} length={4} />);
    expect(screen.getByLabelText("Code")).toHaveAttribute("maxlength", "4");
  });

  it("surfaces an error via aria-invalid", () => {
    render(<OtpField label="Code" value="" onValueChange={() => {}} error="That code is not valid" />);
    expect(screen.getByLabelText("Code")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("That code is not valid")).toBeInTheDocument();
  });

  it("is reachable and operable by keyboard (native focusable input, kept in the tab order)", () => {
    const onValueChange = vi.fn();
    render(<OtpField label="Code" value="" onValueChange={onValueChange} />);
    const input = screen.getByLabelText("Code");
    // A native input is inherently keyboard-operable; it must not be removed from the natural tab order.
    expect(input.tagName).toBe("INPUT");
    expect(input).not.toHaveAttribute("tabindex", "-1");
    input.focus();
    expect(input).toHaveFocus();
    // Typing (keyboard input) flows through the digit filter.
    fireEvent.change(input, { target: { value: "42" } });
    expect(onValueChange).toHaveBeenLastCalledWith("42");
  });
});
