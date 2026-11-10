import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SessionWarningDialog, formatClock } from "./SessionWarningDialog";

describe("formatClock", () => {
  it("formats whole seconds as m:ss with a zero-padded seconds field", () => {
    expect(formatClock(119)).toBe("1:59");
    expect(formatClock(60)).toBe("1:00");
    expect(formatClock(5)).toBe("0:05");
    expect(formatClock(0)).toBe("0:00");
  });

  it("never shows a negative clock", () => {
    expect(formatClock(-3)).toBe("0:00");
  });
});

describe("SessionWarningDialog — idle mode (extendable)", () => {
  it("is an alertdialog with Stay signed in / Sign out and a live countdown", () => {
    const onPrimary = vi.fn();
    const onSecondary = vi.fn();
    render(
      <SessionWarningDialog
        mode="idle-warn"
        secondsLeft={119}
        warnMinutes={2}
        onPrimary={onPrimary}
        onSecondary={onSecondary}
      />,
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /signed out in 2 minutes/i })).toBeInTheDocument();
    expect(screen.getByText("Time left: 1:59")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Stay signed in" }));
    expect(onPrimary).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });
});

describe("SessionWarningDialog — absolute mode (not extendable)", () => {
  it("shows the 4-hour copy with Sign in again / Dismiss", () => {
    const onPrimary = vi.fn();
    const onSecondary = vi.fn();
    render(
      <SessionWarningDialog
        mode="absolute-warn"
        secondsLeft={60}
        warnMinutes={2}
        onPrimary={onPrimary}
        onSecondary={onSecondary}
      />,
    );
    expect(screen.getByRole("heading", { name: /session ends in 2 minutes/i })).toBeInTheDocument();
    expect(screen.getByText(/a session lasts at most 4 hours/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sign in again" }));
    expect(onPrimary).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });
});
