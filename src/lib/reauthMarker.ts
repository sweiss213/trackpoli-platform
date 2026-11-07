// A short-lived, HMAC-signed "you re-authenticated with Google just now" marker (ADR-0009, device
// replacement). Google-only administrators have no password, so the replacement flow re-authenticates them
// through Google; the re-auth callback sets this marker, and the replace-authorize route trusts it only
// while it is fresh and bound to the same user. Signed with the server-only INTERNAL_CALL_SECRET so the
// browser cannot forge it. Server-only (node:crypto).

import { createHmac, timingSafeEqual } from "node:crypto";
import { internalCallSecret } from "@/lib/supabase/config";

const DEFAULT_TTL_MS = 5 * 60 * 1000; // a re-auth is good for five minutes, long enough to enter a code

function sign(payload: string): string {
  return createHmac("sha256", internalCallSecret()).update(payload).digest("hex");
}

/** Build the marker cookie value binding this user to an expiry. */
export function signReauthMarker(userId: string, now: number = Date.now(), ttlMs: number = DEFAULT_TTL_MS): string {
  const expiresAt = now + ttlMs;
  const payload = `${userId}:${expiresAt}`;
  return `${expiresAt}.${sign(payload)}`;
}

/** True iff the marker is well-formed, unexpired, and signed for exactly this user. Fails closed. */
export function verifyReauthMarker(
  value: string | undefined,
  userId: string,
  now: number = Date.now(),
): boolean {
  if (!value) return false;
  const dot = value.indexOf(".");
  if (dot <= 0) return false;
  const expiresAt = Number(value.slice(0, dot));
  const mac = value.slice(dot + 1);
  if (!Number.isFinite(expiresAt) || expiresAt < now) return false;

  const expected = sign(`${userId}:${expiresAt}`);
  // Compare in constant time. Decode both to bytes and guard the lengths explicitly (invalid hex yields a
  // shorter buffer), so timingSafeEqual cannot throw and we never swallow an error (decisions.md).
  const macBytes = Buffer.from(mac, "hex");
  const expectedBytes = Buffer.from(expected, "hex");
  if (macBytes.length !== expectedBytes.length) return false;
  return timingSafeEqual(macBytes, expectedBytes);
}

export const REAUTH_MARKER_COOKIE = "tp-reauth-google";
export const REAUTH_MARKER_TTL_MS = DEFAULT_TTL_MS;
