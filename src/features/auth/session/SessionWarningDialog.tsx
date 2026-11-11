"use client";

// The session-timeout warning dialog (TP1-05; Figma 1396:175539). One component, two modes: "idle-warn" is
// the extendable warning (Stay signed in / Sign out) and "absolute-warn" is the non-extendable 4-hour-cap
// warning (Sign in again / Dismiss). SessionGuard owns the clock and the decisions; this renders and calls
// back. Presentation only.
//
// Accessibility (universal-accessibility-wcag): it is a role="alertdialog" — it interrupts and demands a
// response — labelled by its title and described by its body. Focus moves to the primary action on open, is
// trapped inside while open, and is restored to the trigger on close. The live countdown is visual only
// (aria-hidden) so a screen reader is not spammed every second; the static note sentence carries the meaning.

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { SESSION_MESSAGES as M } from "@/features/auth/messages";
import styles from "./SessionWarningDialog.module.css";

export type WarnMode = "idle-warn" | "absolute-warn";

export interface SessionWarningDialogProps {
  readonly mode: WarnMode;
  readonly secondsLeft: number;
  /** The configured warning lead in whole minutes, for the title. */
  readonly warnMinutes: number;
  /** Idle: "Stay signed in". Absolute: "Sign in again". */
  readonly onPrimary: () => void;
  /** Idle: "Sign out". Absolute: "Dismiss". */
  readonly onSecondary: () => void;
}

/** Format a whole-second remaining count as m:ss (pure; exported for unit tests). */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function SessionWarningDialog({
  mode,
  secondsLeft,
  warnMinutes,
  onPrimary,
  onSecondary,
}: SessionWarningDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const isIdle = mode === "idle-warn";

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>("button");
    // The primary action is rendered last; focus it on open.
    buttons?.[buttons.length - 1]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button");
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, []);

  const title = isIdle ? M.idleTitle(warnMinutes) : M.absoluteTitle(warnMinutes);
  const body = isIdle ? M.idleBody : M.absoluteBody;
  const noteBody = isIdle ? M.idleNoteBody : M.absoluteNoteBody;

  return (
    <div className={styles.overlay} role="presentation">
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-warning-title"
        aria-describedby="session-warning-body"
      >
        <h2 id="session-warning-title" className={styles.title}>
          {title}
        </h2>
        <p id="session-warning-body" className={styles.body}>
          {body}
        </p>
        <div className={styles.note}>
          <span className={styles.noteTitle} aria-hidden="true">
            {M.noteTitle(formatClock(secondsLeft))}
          </span>
          <span className={styles.noteBody}>{noteBody}</span>
        </div>
        <div className={styles.actions}>
          <Button variant="ghost" size="inline" className={styles.textButton} onClick={onSecondary}>
            {isIdle ? M.signOut : M.dismiss}
          </Button>
          <Button variant="secondary" onClick={onPrimary}>
            {isIdle ? M.staySignedIn : M.signInAgain}
          </Button>
        </div>
      </div>
    </div>
  );
}
