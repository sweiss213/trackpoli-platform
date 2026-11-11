import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/apiFetch";
import { TwoFactorCard } from "./TwoFactorCard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/apiFetch", () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockApiFetch = vi.mocked(apiFetch);

const ENROL = { factorId: "new-1", qrCode: "<svg></svg>", secret: "ABCDEFGHIJKLMNOP", uri: "otpauth://x" };

function wireReplace() {
  mockApiFetch.mockImplementation((async (_path: string, opts?: { body?: { step?: string } }) => {
    const step = opts?.body?.step;
    if (step === "authorize") return { outcome: "authorized", enrol: ENROL };
    if (step === "complete") return { outcome: "replaced" };
    return { ok: true };
  }) as unknown as typeof apiFetch);
}

function dialog() {
  return within(screen.getByRole("dialog"));
}

describe("TwoFactorCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the card and opens the replacement modal", () => {
    render(<TwoFactorCard enrolled accountType="password" isManager={false} />);
    expect(screen.getByRole("heading", { name: "Two-factor authentication" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Replace device" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // Opens on the overview/intro first, which reassures the current device stays active.
    expect(dialog().getByRole("heading", { name: "Replace your authenticator device" })).toBeInTheDocument();
    expect(dialog().getByText("Your current device stays active")).toBeInTheDocument();
    expect(dialog().getByRole("button", { name: "Get started" })).toBeInTheDocument();
  });

  it("walks the password replacement: re-auth + code -> new device -> new code -> replaced", async () => {
    wireReplace();
    render(<TwoFactorCard enrolled accountType="password" isManager={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Replace device" }));
    fireEvent.click(dialog().getByRole("button", { name: "Get started" }));

    fireEvent.change(dialog().getByLabelText("Current password"), { target: { value: "pw" } });
    fireEvent.change(dialog().getByLabelText("Code from your current device"), { target: { value: "123456" } });
    fireEvent.click(dialog().getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(dialog().getByRole("heading", { name: "Add your new device" })).toBeInTheDocument());
    fireEvent.click(dialog().getByRole("button", { name: "Continue" }));

    await waitFor(() =>
      expect(dialog().getByRole("heading", { name: "Enter the code from your new device" })).toBeInTheDocument(),
    );
    fireEvent.change(dialog().getByLabelText("6-digit code"), { target: { value: "654321" } });
    fireEvent.click(dialog().getByRole("button", { name: "Replace device" }));

    await waitFor(() =>
      expect(dialog().getByRole("heading", { name: "Authenticator device replaced" })).toBeInTheDocument(),
    );
  });

  it("offers Google re-authentication for a Google-only account", () => {
    render(<TwoFactorCard enrolled accountType="google" isManager={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Replace device" }));
    fireEvent.click(dialog().getByRole("button", { name: "Get started" }));
    expect(dialog().getByRole("button", { name: /Re-authenticate with Google/ })).toBeInTheDocument();
    // No password field for a Google-only account.
    expect(dialog().queryByLabelText("Current password")).not.toBeInTheDocument();
  });

  it("shows the manager recovery copy on the lost-device path for a manager", () => {
    render(<TwoFactorCard enrolled accountType="password" isManager />);
    fireEvent.click(screen.getByRole("button", { name: "Replace device" }));
    fireEvent.click(dialog().getByRole("button", { name: "Get started" }));
    fireEvent.click(dialog().getByRole("button", { name: /I don.t have my current device/ }));
    expect(dialog().getByText(/another Admin manager must re-create your account/)).toBeInTheDocument();
    expect(dialog().getByText(/If you're the only Admin manager/)).toBeInTheDocument();
  });

  it("shows the admin recovery copy on the lost-device path for a non-manager", () => {
    render(<TwoFactorCard enrolled accountType="password" isManager={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Replace device" }));
    fireEvent.click(dialog().getByRole("button", { name: "Get started" }));
    fireEvent.click(dialog().getByRole("button", { name: /I don.t have my current device/ }));
    expect(dialog().getByText(/an Admin manager must re-create your account/)).toBeInTheDocument();
    expect(dialog().getByText(/Your history stays readable/)).toBeInTheDocument();
  });

  it("associates the migrated fields with their labels (shadcn Input + Label)", () => {
    render(<TwoFactorCard enrolled accountType="password" isManager={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Replace device" }));
    fireEvent.click(dialog().getByRole("button", { name: "Get started" }));
    const password = dialog().getByLabelText("Current password");
    const code = dialog().getByLabelText("Code from your current device");
    expect(password.tagName).toBe("INPUT");
    expect(code.tagName).toBe("INPUT");
  });
});
