import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/apiFetch";
import { ActiveSessionsCard } from "./ActiveSessionsCard";

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

describe("ActiveSessionsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the bulk sign-out row and the current-device marker", () => {
    render(<ActiveSessionsCard />);
    expect(screen.getByRole("heading", { name: "Active sessions" })).toBeInTheDocument();
    expect(screen.getByText("This device")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out other sessions" })).toBeInTheDocument();
  });

  it("signs out other sessions and confirms success", async () => {
    mockApiFetch.mockResolvedValue({ ok: true } as never);
    render(<ActiveSessionsCard />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out other sessions" }));

    await waitFor(() =>
      expect(screen.getByText("Signed out of your other sessions.")).toBeInTheDocument(),
    );
    expect(mockApiFetch).toHaveBeenCalledWith("/admin/api/session/sign-out-others", { method: "POST" });
  });

  it("shows an error when the revoke fails", async () => {
    mockApiFetch.mockRejectedValue(new Error("boom"));
    render(<ActiveSessionsCard />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out other sessions" }));

    await waitFor(() =>
      expect(screen.getByText("We couldn't sign out the other sessions. Please try again.")).toBeInTheDocument(),
    );
  });
});
