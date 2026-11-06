// SHA-256 hex of the lower-cased, trimmed email — the per-account lockout key (migration 010). It mirrors
// the Edge Functions' _shared/auth.ts emailHash byte-for-byte, so the counter the reset flow clears is the
// same one the sign-in lockout increments. No raw address is stored anywhere (sign_in_lockouts.email_hash
// is not-personal per data-map.json).

export async function emailHashHex(email: string): Promise<string> {
  const data = new TextEncoder().encode(email.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
