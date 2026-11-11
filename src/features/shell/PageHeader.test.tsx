import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { PageHeader } from "@/features/shell/PageHeader";

describe("PageHeader", () => {
  it("renders the title as the page's single h1", () => {
    render(<PageHeader title="Politicians" />);
    const heading = screen.getByRole("heading", { level: 1, name: "Politicians" });
    expect(heading).toBeInTheDocument();
  });

  it("renders the actions cluster when provided", () => {
    render(<PageHeader title="Politicians" actions={<button type="button">New record</button>} />);
    expect(screen.getByRole("button", { name: "New record" })).toBeInTheDocument();
  });

  it("passes a crumb href straight to the link as a basePath-relative path (ADR-0018)", () => {
    // Crumb hrefs are app-relative; Next adds the /admin basePath. A caller must never put a literal
    // /admin in a crumb (it would double-prefix to /admin/admin/... 404) - the arch-gate rule forbids it.
    // PageHeader must pass the href through verbatim so a basePath-relative value stays basePath-relative.
    render(
      <PageHeader
        title="Politicians"
        breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Politicians" }]}
      />,
    );
    const crumb = screen.getByRole("link", { name: "Dashboard" });
    expect(crumb).toHaveAttribute("href", "/");
    expect(crumb.getAttribute("href") ?? "").not.toContain("/admin/admin");
  });

  it("renders a breadcrumb nav with links and a current page", () => {
    render(
      <PageHeader
        title="Billing"
        breadcrumbs={[
          // Crumb hrefs are app-relative and passed straight to next/link: Next adds the /admin basePath,
          // so a literal /admin here would double-prefix to /admin/admin/admins (404, ADR-0014).
          { label: "Admin management", href: "/admins" },
          { label: "Billing" },
        ]}
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(nav).toBeInTheDocument();
    const crumbLink = screen.getByRole("link", { name: "Admin management" });
    expect(crumbLink).toHaveAttribute("href", "/admins");
    expect(crumbLink.getAttribute("href") ?? "").not.toContain("/admin/admin");
    // The last crumb has no link and is marked as the current page.
    expect(screen.getByText("Billing", { selector: "[aria-current='page']" })).toBeInTheDocument();
  });

  it("omits the breadcrumb nav when none is given", () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.queryByRole("navigation", { name: "Breadcrumb" })).not.toBeInTheDocument();
  });
});
