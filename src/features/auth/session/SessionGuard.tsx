"use client";

// SessionGuard — the client half of safe sessions (TP1-05). Mounted once, app-wide, for a signed-in
// administrator. It watches real interaction, pings the server at most once per activity window to re-stamp
// the signed last-activity cookie, runs the idle and 4-hour countdowns, shows the matching warning dialog,
// and ends the session when a limit is reached. It coordinates across tabs over the trackpoli-auth channel:
// one tab's activity or "Stay signed in" resets the others, and a sign-out in one tab signs out all.
//
// This is the UX layer, not the boundary: the middleware's signed cookie enforces the limits server-side and
// RLS is the real authorization gate (ADR-0009/0010). The browser never reads the activity cookie (HttpOnly);
// SessionGuard runs its countdown against the server-provided session start and its own interaction clock.

import { useEffect, useRef, useState } from "react";
import { computeSessionPhase, type ExpiryCause } from "./idleTimer";
import { createAuthChannel } from "./authChannel";
import { SessionWarningDialog, type WarnMode } from "./SessionWarningDialog";
import { apiFetch, SESSION_EXPIRED_EVENT } from "@/lib/apiFetch";
import { report } from "@/lib/report";
import type { SessionLimits } from "@/lib/config";

interface ActivityResponse {
  readonly ok: boolean;
  readonly startMs?: number;
  readonly nowMs?: number;
}

interface WarnState {
  readonly mode: WarnMode;
  readonly secondsLeft: number;
}

interface WarnHandlers {
  stay: () => void;
  signOut: () => void;
  signInAgain: () => void;
  dismiss: () => void;
}

const NO_HANDLERS: WarnHandlers = { stay() {}, signOut() {}, signInAgain() {}, dismiss() {} };

export function SessionGuard({ enabled, limits }: { enabled: boolean; limits: SessionLimits }) {
  const [warn, setWarn] = useState<WarnState | null>(null);
  // The dialog's buttons call the live closures created inside the effect; a ref bridges them to the render
  // without re-subscribing listeners on every state change (and without any shared module state).
  const handlersRef = useRef<WarnHandlers>(NO_HANDLERS);
  const warnMinutes = Math.max(1, Math.round(limits.warnLeadMs / 60_000));

  useEffect(() => {
    if (!enabled) return;

    const start = Date.now();
    let lastActivity = start;
    let sessionStart = start;
    let lastPing = 0;
    let dirty = false;
    let absoluteDismissed = false;
    let ending = false;

    const channel = createAuthChannel((message) => {
      if (message.type === "signed-out") {
        void leave("sign-in", null, false);
      } else {
        // Another tab is active (or pressed "Stay signed in") — reset our idle clock and drop the warning.
        lastActivity = Math.max(lastActivity, message.at);
        if (message.type === "stay") {
          absoluteDismissed = false;
          setWarn(null);
        }
      }
    });

    async function ping(): Promise<void> {
      lastPing = Date.now();
      dirty = false;
      try {
        const response = await apiFetch<ActivityResponse>("/admin/api/session/activity", { method: "POST" });
        if (response.ok && typeof response.startMs === "number") sessionStart = response.startMs;
      } catch (error) {
        // A 401 has already dispatched the expiry event (handled below); other failures are transient.
        report("debug", "activity ping failed", {
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    function syncActivity(now: number, kind: "activity" | "stay"): void {
      channel.post({ type: kind, at: now });
      void ping();
    }

    async function leave(target: "sign-in" | "expired", cause: ExpiryCause | null, broadcast: boolean): Promise<void> {
      if (ending) return;
      ending = true;
      if (broadcast) channel.post({ type: "signed-out" });
      const path = window.location.pathname;
      if (target === "sign-in") {
        try {
          await apiFetch("/admin/api/sign-out", { method: "POST" });
        } catch (error) {
          report("debug", "sign-out during leave failed", {
            reason: error instanceof Error ? error.message : String(error),
          });
        }
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload so the cleared session cookies apply and the client timers reset
        window.location.assign(`/admin/sign-in?next=${encodeURIComponent(path)}`);
      } else {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload into the public expired screen; the session is gone
        window.location.assign(`/admin/session-expired?reason=${cause ?? "idle"}&next=${encodeURIComponent(path)}`);
      }
    }

    function onActivity(): void {
      lastActivity = Date.now();
      dirty = true;
    }

    function tick(): void {
      const now = Date.now();
      if (dirty && now - lastPing >= limits.activityPingMs) syncActivity(now, "activity");

      const result = computeSessionPhase({ now, lastActivity, sessionStart, limits });
      if (result.phase === "expired") {
        void leave("expired", result.cause, true);
        return;
      }
      if (result.phase === "idle-warn") {
        absoluteDismissed = false;
        setWarn({ mode: "idle-warn", secondsLeft: Math.ceil(result.msUntilExpiry / 1000) });
      } else if (result.phase === "absolute-warn") {
        if (!absoluteDismissed) {
          setWarn({ mode: "absolute-warn", secondsLeft: Math.ceil(result.msUntilExpiry / 1000) });
        }
      } else {
        setWarn(null);
      }
    }

    function onExpiredEvent(): void {
      void leave("expired", "idle", true);
    }

    function onFocus(): void {
      void ping(); // re-read the session on return; a server-side revoke comes back 401 -> expiry event
    }

    handlersRef.current = {
      stay: () => {
        const now = Date.now();
        lastActivity = now;
        absoluteDismissed = false;
        setWarn(null);
        syncActivity(now, "stay");
      },
      signOut: () => void leave("sign-in", null, true),
      signInAgain: () => void leave("sign-in", null, true),
      dismiss: () => {
        absoluteDismissed = true;
        setWarn(null);
      },
    };

    const activityEvents = ["pointerdown", "keydown", "scroll", "pointermove"] as const;
    for (const type of activityEvents) window.addEventListener(type, onActivity, { passive: true });
    window.addEventListener("focus", onFocus);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpiredEvent);
    void ping();
    const interval = window.setInterval(tick, 1000);

    return () => {
      window.clearInterval(interval);
      for (const type of activityEvents) window.removeEventListener(type, onActivity);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpiredEvent);
      channel.close();
      handlersRef.current = NO_HANDLERS;
    };
    // limits is stable per mount (server-provided); enabled toggles the whole guard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  if (!warn) return null;
  const isIdle = warn.mode === "idle-warn";
  return (
    <SessionWarningDialog
      mode={warn.mode}
      secondsLeft={warn.secondsLeft}
      warnMinutes={warnMinutes}
      onPrimary={isIdle ? () => handlersRef.current.stay() : () => handlersRef.current.signInAgain()}
      onSecondary={isIdle ? () => handlersRef.current.signOut() : () => handlersRef.current.dismiss()}
    />
  );
}
