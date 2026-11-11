import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, ApiError } from "@/lib/apiFetch";
import { MfaEnrolPage } from "./MfaEnrolPage";

vi.mock("@/lib/apiFetch", () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

const mockApiFetch = vi.mocked(apiFetch);

const START = {
  factorId: "factor-1",
  qrCode: "<svg></svg>",
  secret: "ABCDEFGHIJKLMNOP",
  uri: "otpauth://totp/TrackPoli:abe",
};

type ConfirmOutcome = { outcome: "enrolled" | "invalid_code" | "too_many_attempts" };

// Wire apiFetch: begin -> START, confirm -> the given outcome, anything else (sign-out) -> ok.
function wire(confirm: ConfirmOutcome | (() => never)) {
  mockApiFetch.mockImplementation((async (_path: string, opts?: { body?: { step?: string } }) => {
    const step = opts?.body?.step;
    if (step === "begin") return START;
    if (step === "confirm") return typeof confirm === "function" ? confirm() : confirm;
    return { ok: true };
  }) as unknown as typeof apiFetch);
}

async function advanceToCode() {
  fireEvent.click(screen.getByRole("button", { name: "Continue" })); // begin -> scan
  await screen.findByRole("heading", { name: "Scan the QR code" });
  fireEvent.click(screen.getByRole("button", { name: "Continue" })); // scan -> code
  await screen.findByRole("heading", { name: "Enter the 6-digit code" });
  fireEvent.change(screen.getByLabelText("6-digit code"), { target: { value: "123456" } });
  fireEvent.click(screen.getByRole("button", { name: "Verify and turn on" }));
}

describe("MfaEnrolPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the instructions gate", () => {
    render(<MfaEnrolPage email="abe@example.test" />);
    expect(screen.getByRole("heading", { name: "Set up two-step verification" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(
      screen.getByText(/can't access the TrackPoli Admin Dashboard until two-step verification is set up/i),
    ).toBeInTheDocument();
  });

  it("walks begin -> scan -> code -> success and goes to aal2", async () => {
    wire({ outcome: "enrolled" });
    render(<MfaEnrolPage email="abe@example.test" />);
    await advanceToCode();
    await screen.findByRole("heading", { name: "Two-step verification is on" });
    expect(screen.getByRole("button", { name: "Go to dashboard" })).toBeInTheDocument();
  });

  it("shows the manual setup key when the user can't scan", async () => {
    wire({ outcome: "enrolled" });
    render(<MfaEnrolPage email="abe@example.test" />);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { name: "Scan the QR code" });
    fireEvent.click(screen.getByRole("button", { name: "Can't scan? Enter a key instead" }));
    await screen.findByRole("heading", { name: "Enter the key manually" });
    // Secret is grouped into 4-char blocks.
    expect(screen.getByText("ABCD EFGH IJKL MNOP")).toBeInTheDocument();
    expect(screen.getByText(/TrackPoli Admin · abe@example.test/)).toBeInTheDocument();
  });

  it("shows a wrong-code banner on an invalid code and stays on the code step", async () => {
    wire({ outcome: "invalid_code" });
    render(<MfaEnrolPage email="abe@example.test" />);
    await advanceToCode();
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("That code isn't right. Check your app and try again."),
    );
    expect(screen.getByRole("heading", { name: "Enter the 6-digit code" })).toBeInTheDocument();
    // The migrated design-system input exposes its error state to assistive tech (shadcn Input aria-invalid).
    expect(screen.getByLabelText("6-digit code")).toHaveAttribute("aria-invalid", "true");
  });

  it("switches to the paused screen when verification is rate-limited", async () => {
    wire({ outcome: "too_many_attempts" });
    render(<MfaEnrolPage email="abe@example.test" />);
    await advanceToCode();
    await screen.findByRole("heading", { name: "Setup temporarily paused" });
  });

  it("shows the could-not-start-setup screen when begin fails", async () => {
    mockApiFetch.mockRejectedValue(new Error("boom"));
    render(<MfaEnrolPage email="abe@example.test" />);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { name: "We couldn't start setup" });
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("shows the setup-session-expired screen on a 401 (signed out mid-enrolment)", async () => {
    mockApiFetch.mockRejectedValue(new ApiError("no session", 401));
    render(<MfaEnrolPage email="abe@example.test" />);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { name: "Your setup session expired" });
    expect(screen.getByRole("button", { name: "Sign in again" })).toBeInTheDocument();
  });
});
