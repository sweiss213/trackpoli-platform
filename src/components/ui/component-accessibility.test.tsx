// Executable coverage for the design-system component-accessibility scenarios A1-A4
// (features/design-system/component-accessibility.feature), ADR-0011. Renders the shadcn/ui primitives
// and asserts the accessibility contract the sign-in migration relies on. A5 (rendered contrast) and A6
// (cross-browser) are not assessable in jsdom and are covered by the a11y record + the no-UA gate.
import { render, screen, fireEvent } from "@testing-library/react";
import { useId } from "react";
import { describe, it, expect, vi } from "vitest";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

describe("design-system component accessibility", () => {
  // A1: the button is keyboard operable with an accessible name.
  it("A1: button exposes its accessible name, is a native button, and activates on click", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button.tagName).toBe("BUTTON"); // a native button is inherently keyboard-operable (Enter/Space)
    button.focus();
    expect(button).toHaveFocus();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  // A2: the input exposes its label (programmatic association) and aria-invalid on error.
  it("A2: input is labelled and exposes aria-invalid when in an error state", () => {
    function Field() {
      const id = useId();
      return (
        <div>
          <Label htmlFor={id}>Email</Label>
          <Input id={id} aria-invalid />
        </div>
      );
    }
    render(<Field />);
    const input = screen.getByLabelText("Email");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  // A3: the alert announces errors (role=alert / live region).
  it("A3: alert exposes role=alert so a screen reader announces it", () => {
    render(
      <Alert>
        <AlertDescription>Something went wrong</AlertDescription>
      </Alert>,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong");
  });

  // A4: a disabled control is non-interactive and announced as disabled.
  it("A4: a disabled button cannot be activated and is announced as disabled", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
