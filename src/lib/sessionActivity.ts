// The signed last-activity cookie that lets the edge middleware enforce the idle and absolute session limits
// (TP1-05, Q-1-02). It carries two timestamps — when the session started (absolute cap) and when the
// administrator was last active (idle cap) — HMAC-signed with the server-only INTERNAL_CALL_SECRET so the
// browser cannot forge or extend it. It holds NO token and is not the session itself; the Supabase HttpOnly
// cookie remains the session (ADR-0005). The real authorization boundary is still the RLS aal2 gate — this
// cookie is a UX + defense-in-depth timeout, so a missing or unreadable cookie fails open to "let the request
// through" (RLS still protects the data) rather than locking an administrator out.
//
// Signing uses Web Crypto (globalThis.crypto.subtle), which runs in BOTH the edge middleware and node routes,
// unlike node:crypto (used by reauthMarker.ts, which only runs in node). evaluateActivity is pure and carries
// the timer-edge unit tests; the sign/read pair wraps it in HMAC verification.

import { report } from "@/lib/report";
import type { SessionLimits } from "@/lib/config";

export const ACTIVITY_COOKIE = "tp-activity";

export interface ActivityPayload {
  /** Session start (ms epoch) — drives the absolute cap. */
  readonly start: number;
  /** Last activity (ms epoch) — drives the idle cap. */
  readonly last: number;
}

export type ActivityState = "active" | "idle-expired" | "absolute-expired";

/**
 * Decide whether the session is still within both limits (pure). The absolute cap is checked first: once the
 * hard deadline passes it passes, regardless of how recent the last activity was.
 */
export function evaluateActivity(
  payload: ActivityPayload,
  now: number,
  limits: Pick<SessionLimits, "idleMs" | "absoluteMs">,
): ActivityState {
  if (now - payload.start >= limits.absoluteMs) return "absolute-expired";
  if (now - payload.last >= limits.idleMs) return "idle-expired";
  return "active";
}

// --- base64url helpers (edge- and node-safe: btoa/atob are global in both) ---

const B64URL = /^[A-Za-z0-9_-]+$/;

function bytesToB64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Build the signed cookie value `<payload>.<hmac>` binding these timestamps to the server secret. */
export async function signActivity(payload: ActivityPayload, secret: string): Promise<string> {
  const body = bytesToB64url(new TextEncoder().encode(JSON.stringify({ s: payload.start, l: payload.last })));
  const key = await hmacKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  return `${body}.${bytesToB64url(sig)}`;
}

/**
 * Verify and parse the cookie. Returns the timestamps only when the HMAC checks out and the payload is
 * well-formed; otherwise null (fail closed). A forged signature verifies to false in constant time; a
 * malformed value is reported at debug (an anomaly worth a line, never swallowed) and treated as absent.
 */
export async function readActivity(value: string | undefined, secret: string): Promise<ActivityPayload | null> {
  if (!value) return null;
  const dot = value.indexOf(".");
  if (dot <= 0) return null;
  const body = value.slice(0, dot);
  const mac = value.slice(dot + 1);
  if (!B64URL.test(body) || !B64URL.test(mac)) return null;

  try {
    const key = await hmacKey(secret);
    const ok = await crypto.subtle.verify("HMAC", key, b64urlToBytes(mac), new TextEncoder().encode(body));
    if (!ok) return null;
    const parsed = JSON.parse(new TextDecoder().decode(b64urlToBytes(body))) as { s?: unknown; l?: unknown };
    if (typeof parsed.s !== "number" || typeof parsed.l !== "number") return null;
    if (!Number.isFinite(parsed.s) || !Number.isFinite(parsed.l)) return null;
    return { start: parsed.s, last: parsed.l };
  } catch (error) {
    report("debug", "activity cookie could not be read", {
      reason: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
