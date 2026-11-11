import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { ErrorBoundary } from "@/components/ui/error-boundary";
import * as reporter from "@/lib/report";

function Boom(): never {
  throw new Error("kaboom");
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // React logs the caught error to console.error; silence it for a clean test run.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("renders the default ErrorState fallback and reports when a child throws", () => {
    const reportSpy = vi.spyOn(reporter, "report").mockImplementation(() => {});
    render(
      <ErrorBoundary requestId="req-123" label="dashboard">
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Something went wrong" })).toBeInTheDocument();
    expect(reportSpy).toHaveBeenCalledWith(
      "error",
      "Unhandled render error caught by ErrorBoundary",
      expect.objectContaining({ reason: "kaboom", requestId: "req-123", label: "dashboard" }),
    );
  });

  it("renders a custom fallback when provided", () => {
    vi.spyOn(reporter, "report").mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<p>Custom fallback</p>}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Custom fallback")).toBeInTheDocument();
  });
});
