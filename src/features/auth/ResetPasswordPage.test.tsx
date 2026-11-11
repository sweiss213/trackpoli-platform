import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/apiFetch";
import { ResetPasswordPage } from "./ResetPasswordPage";

vi.mock("@/lib/apiFetch", () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockApiFetch = vi.mocked(apiFetch);
const LONG = "correct-horse-battery-staple"; // >= 12 chars

describe("ResetPasswordPage (shadcn migration)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the set-password form with both design-system password fields", () => {
    render(<ResetPasswordPage email="amara@trackpoli.org" />);
    expect(screen.getByRole("heading", { name: "Set a new password" })).toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm new password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset password" })).toBeInTheDocument();
  });

  it("toggles the new-password visibility (parity with the hand-built toggle)", () => {
    render(<ResetPasswordPage email="amara@trackpoli.org" />);
    const field = screen.getByLabelText("New password") as HTMLInputElement;
    expect(field.type).toBe("password");
    // The first "Show password" toggle belongs to the new-password field.
    fireEvent.click(screen.getAllByRole("button", { name: "Show password" })[0]);
    expect(field.type).toBe("text");
  });

  it("shows the mismatch helper and marks the confirm field invalid when the two differ", () => {
    render(<ResetPasswordPage email="amara@trackpoli.org" />);
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: LONG } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: LONG + "x" } });
    expect(screen.getByText("Both passwords must match.")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm new password")).toHaveAttribute("aria-invalid", "true");
    // Submit stays disabled while the passwords differ.
    expect(screen.getByRole("button", { name: "Reset password" })).toBeDisabled();
  });

  it("submits when the passwords match and meet the length rule", async () => {
    mockApiFetch.mockResolvedValue({ outcome: "weak_password" }); // any non-redirect outcome keeps the DOM
    render(<ResetPasswordPage email="amara@trackpoli.org" />);
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: LONG } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: LONG } });
    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith("/admin/api/reset-password", expect.anything()));
  });
});
