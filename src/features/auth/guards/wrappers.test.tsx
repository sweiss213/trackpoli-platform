import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthState } from "@/features/auth/AuthProvider";
import { useAuth } from "@/features/auth/useAuth";
import { PublicOnly, RequireActive, RequireRole, RequireSession } from "./wrappers";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/features/auth/useAuth", () => ({ useAuth: vi.fn() }));

const mockUseAuth = vi.mocked(useAuth);
function auth(over: Partial<AuthState["user"]> | null, authenticated = over !== null): void {
  mockUseAuth.mockReturnValue({
    user: over === null ? null : { id: "u", email: "a@example.test", role: null, status: null, ...over },
    isAuthenticated: authenticated,
  } as AuthState);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PublicOnly", () => {
  it("shows the children to an anonymous visitor", () => {
    auth(null);
    render(<PublicOnly><p>sign in form</p></PublicOnly>);
    expect(screen.getByText("sign in form")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects a signed-in administrator into the app", () => {
    auth({ role: "admin", status: "active" });
    render(<PublicOnly><p>sign in form</p></PublicOnly>);
    expect(screen.queryByText("sign in form")).not.toBeInTheDocument();
    // basePath-relative: router.replace prepends the "/admin" basePath, so a literal "/admin" here would be /admin/admin.
    expect(replace).toHaveBeenCalledWith("/");
  });
});

describe("RequireSession", () => {
  it("renders for a session and redirects an anonymous visitor to sign-in", () => {
    auth({ role: "admin", status: "active" });
    const { rerender } = render(<RequireSession><p>app</p></RequireSession>);
    expect(screen.getByText("app")).toBeInTheDocument();

    auth(null);
    rerender(<RequireSession><p>app</p></RequireSession>);
    expect(replace).toHaveBeenCalledWith("/sign-in");
  });
});

describe("RequireActive", () => {
  it("renders for an active admin and routes a deactivated one away", () => {
    auth({ role: "admin", status: "active" });
    const { rerender } = render(<RequireActive><p>app</p></RequireActive>);
    expect(screen.getByText("app")).toBeInTheDocument();

    auth({ role: "admin", status: "deactivated" });
    rerender(<RequireActive><p>app</p></RequireActive>);
    expect(replace).toHaveBeenCalledWith("/sign-in");
  });
});

describe("RequireRole", () => {
  it("shows manager-only children only to an administrator manager", () => {
    auth({ role: "admin_manager", status: "active" });
    render(<RequireRole role="admin_manager"><button>Invite admin</button></RequireRole>);
    expect(screen.getByRole("button", { name: "Invite admin" })).toBeInTheDocument();
  });

  it("hides manager-only children from an administrator, showing the fallback", () => {
    auth({ role: "admin", status: "active" });
    render(
      <RequireRole role="admin_manager" fallback={<span>no access</span>}>
        <button>Invite admin</button>
      </RequireRole>,
    );
    expect(screen.queryByRole("button", { name: "Invite admin" })).not.toBeInTheDocument();
    expect(screen.getByText("no access")).toBeInTheDocument();
  });
});
