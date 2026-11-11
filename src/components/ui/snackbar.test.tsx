import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { SnackbarProvider, useSnackbar } from "@/components/ui/snackbar";

function Trigger({ options }: { options: Parameters<ReturnType<typeof useSnackbar>["show"]>[0] }) {
  const { show } = useSnackbar();
  return (
    <button type="button" onClick={() => show(options)}>
      fire
    </button>
  );
}

describe("SnackbarProvider / useSnackbar", () => {
  it("shows a message when show() is called", () => {
    render(
      <SnackbarProvider>
        <Trigger options={{ message: "Changes saved" }} />
      </SnackbarProvider>,
    );
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "fire" }));
    });
    expect(screen.getByText("Changes saved")).toBeInTheDocument();
  });

  it("renders an action button and invokes its handler", () => {
    const onUndo = vi.fn();
    render(
      <SnackbarProvider>
        <Trigger options={{ message: "Record deleted", action: { label: "Undo", onClick: onUndo } }} />
      </SnackbarProvider>,
    );
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "fire" }));
    });
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onUndo).toHaveBeenCalledOnce();
  });

  it("throws if useSnackbar is used outside a provider", () => {
    function Orphan() {
      useSnackbar();
      return null;
    }
    // Suppress the expected React error boundary noise.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Orphan />)).toThrow(/within a <SnackbarProvider>/);
    spy.mockRestore();
  });
});
