import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/apiFetch";
import { MfaVerifyPage } from "./MfaVerifyPage";

vi.mock("@/lib/apiFetch", () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockApiFetch = vi.mocked(apiFetch);

function typeCode(value: string) {
  fireEvent.change(screen.getByLabelText("Verification code"), { target: { value } });
}

describe("MfaVerifyPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the verification form", () => {
    render(<MfaVerifyPage />);
    expect(screen.getByRole("heading", { name: "Two-step verification" })).toBeInTheDocument();
    expect(screen.getByLabelText("Verification code")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verify" })).toBeInTheDocument();
    expect(
      screen.getByText(/An Admin Manager will need to re-create your account\./),
    ).toBeInTheDocument();
  });

  it("keeps Verify disabled until a full 6-digit code is entered", () => {
    render(<MfaVerifyPage />);
    const verify = screen.getByRole("button", { name: "Verify" });
    expect(verify).toBeDisabled();
    typeCode("123");
    expect(verify).toBeDisabled();
    typeCode("123456");
    expect(verify).toBeEnabled();
  });

  it("strips non-digits and caps the code at 6 characters", () => {
    render(<MfaVerifyPage />);
    const input = screen.getByLabelText("Verification code") as HTMLInputElement;
    typeCode("12ab3456789");
    expect(input.value).toBe("123456");
  });

  it("posts the code to the verify endpoint", async () => {
    mockApiFetch.mockResolvedValue({ outcome: "invalid_code" });
    render(<MfaVerifyPage />);
    typeCode("309471");
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith("/admin/api/mfa/verify", {
        method: "POST",
        body: { code: "309471" },
      }),
    );
  });

  it("shows a non-committal error on an invalid code", async () => {
    mockApiFetch.mockResolvedValue({ outcome: "invalid_code" });
    render(<MfaVerifyPage />);
    typeCode("000000");
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "That code didn't match. Check your authenticator app and try again.",
      ),
    );
  });

  it("surfaces the no-factor anomaly message", async () => {
    mockApiFetch.mockResolvedValue({ outcome: "no_factor" });
    render(<MfaVerifyPage />);
    typeCode("309471");
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Something went wrong setting up two-factor. Please sign in again.",
      ),
    );
  });
});
