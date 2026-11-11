import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { EmptyState, LoadingState, ErrorState } from "@/components/ui/states";

describe("EmptyState", () => {
  it("renders a heading and optional body and action", () => {
    render(<EmptyState title="No records" body="Add one to get started." action={<button type="button">Add</button>} />);
    expect(screen.getByRole("heading", { level: 2, name: "No records" })).toBeInTheDocument();
    expect(screen.getByText("Add one to get started.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("uses a generic default title when none is given", () => {
    render(<EmptyState />);
    expect(screen.getByRole("heading", { level: 2, name: "Nothing here yet" })).toBeInTheDocument();
  });
});

describe("LoadingState", () => {
  it("is a polite live region with a text label (not spinner-only)", () => {
    render(<LoadingState />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Loading…");
  });

  it("accepts a custom label", () => {
    render(<LoadingState label="Fetching politicians…" />);
    expect(screen.getByRole("status")).toHaveTextContent("Fetching politicians…");
  });
});

describe("ErrorState", () => {
  it("renders a heading, default body, and an optional retry action", () => {
    render(<ErrorState action={<button type="button">Try again</button>} />);
    expect(screen.getByRole("heading", { level: 2, name: "Something went wrong" })).toBeInTheDocument();
    expect(screen.getByText("This could not be loaded. Please try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
