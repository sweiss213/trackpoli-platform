// Cross-tab coordination for sessions (TP1-05): one tab's activity, "stay signed in", and sign-out reach the
// other tabs so they agree. Uses BroadcastChannel where available and falls back to a localStorage "storage"
// event otherwise — chosen by FEATURE DETECTION, never user-agent sniffing (universal-browser-device-support).
// Neither transport echoes to the tab that posted (BroadcastChannel does not deliver to its own sender;
// a storage event does not fire in the writing tab), which is exactly what we want: a tab acts locally and
// tells the others. SSR-safe: off the browser, createAuthChannel returns an inert channel.
//
// This module holds no token and makes no auth decision; it is a message bus. parseAuthMessage is the pure,
// unit-tested validator for anything arriving on it (data from another tab is still untrusted input).

import { report } from "@/lib/report";

export const AUTH_CHANNEL_NAME = "trackpoli-auth";
const STORAGE_KEY = "trackpoli-auth-signal";

export type AuthChannelMessage =
  | { readonly type: "activity"; readonly at: number } // interacted at `at` (ms epoch): reset idle elsewhere
  | { readonly type: "stay"; readonly at: number } // pressed "Stay signed in": same effect, explicit
  | { readonly type: "signed-out" }; // this tab left: every tab should leave

export interface AuthChannel {
  post(message: AuthChannelMessage): void;
  close(): void;
}

/** Validate a message arriving from another tab (untrusted input). Returns null for anything unexpected. */
export function parseAuthMessage(data: unknown): AuthChannelMessage | null {
  if (typeof data !== "object" || data === null) return null;
  const record = data as Record<string, unknown>;
  if (record.type === "signed-out") return { type: "signed-out" };
  if ((record.type === "activity" || record.type === "stay") && typeof record.at === "number") {
    return Number.isFinite(record.at) ? { type: record.type, at: record.at } : null;
  }
  return null;
}

const INERT: AuthChannel = { post() {}, close() {} };

/** Open a channel and deliver validated messages from other tabs to `onMessage`. Inert during SSR. */
export function createAuthChannel(onMessage: (message: AuthChannelMessage) => void): AuthChannel {
  if (typeof window === "undefined") return INERT;

  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
    channel.onmessage = (event) => {
      const message = parseAuthMessage(event.data);
      if (message) onMessage(message);
    };
    return {
      post: (message) => channel.postMessage(message),
      close: () => channel.close(),
    };
  }

  // Fallback: a short-lived localStorage write that other tabs observe via the "storage" event.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      const message = parseAuthMessage(JSON.parse(event.newValue));
      if (message) onMessage(message);
    } catch (error) {
      report("debug", "auth channel storage signal could not be parsed", {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  };
  window.addEventListener("storage", onStorage);
  return {
    post: (message) => {
      try {
        // A nonce makes each write distinct so repeated identical signals still fire a storage event.
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...message, nonce: Date.now() + Math.random() }));
      } catch (error) {
        report("debug", "auth channel storage signal could not be written", {
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    },
    close: () => window.removeEventListener("storage", onStorage),
  };
}
