import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/apiFetch";
import { SessionExpiredPage } from "./SessionExpiredPage";

let search = new URLSearchParams();
vi.mock("next/navigation", () => ({ useSearchParams: () => search }));
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

describe("SessionExpiredPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockResolvedValue({ ok: true } as never);
    search = new URLSearchParams();
  });

  it("shows the inactivity copy by default (idle timeout)", () => {
    render(<SessionExpiredPage />);
    expect(screen.getByRole("heading", { name: "Your session has expired" })).toBeInTheDocument();
    expect(screen.getByText(/signed out after a period of inactivity/i)).toBeInTheDocument();
    // The footnote states the 15-minute policy (corrected from the design placeholder).
    expect(screen.getByText(/after 15 minutes of inactivity/i)).toBeInTheDocument();
  });

  it("shows the 4-hour copy when the reason is absolute", () => {
    search = new URLSearchParams("reason=absolute");
    render(<SessionExpiredPage />);
    expect(screen.getByRole("heading", { name: "Your session has ended" })).toBeInTheDocument();
    expect(screen.getByText(/reached its 4-hour limit/i)).toBeInTheDocument();
  });

  it("fires a best-effort server sign-out on mount", () => {
    render(<SessionExpiredPage />);
    expect(mockApiFetch).toHaveBeenCalledWith("/admin/api/sign-out", { method: "POST" });
  });
});
