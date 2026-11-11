import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function setup(overrides: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <ConfirmDialog
      open
      onOpenChange={onOpenChange}
      title="Deactivate administrator?"
      body="They will be signed out of all sessions immediately."
      confirmLabel="Deactivate"
      onConfirm={onConfirm}
      destructive
      {...overrides}
    />,
  );
  return { onConfirm, onOpenChange };
}

describe("ConfirmDialog", () => {
  it("renders an accessible dialog labelled by its title and described by its body", () => {
    setup();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName("Deactivate administrator?");
    expect(dialog).toHaveAccessibleDescription("They will be signed out of all sessions immediately.");
  });

  it("fires onConfirm when the confirm button is activated", () => {
    const { onConfirm } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("requests close when Cancel is activated", () => {
    const { onOpenChange, onConfirm } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("disables the confirm button while the action is pending", () => {
    setup({ confirmPending: true });
    expect(screen.getByRole("button", { name: "Deactivate" })).toBeDisabled();
  });

  it("does not render dialog content when closed", () => {
    render(
      <ConfirmDialog
        open={false}
        onOpenChange={() => {}}
        title="Hidden"
        body="Nope"
        confirmLabel="Go"
        onConfirm={() => {}}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
