// Caller identity and the privileged client, shared by every function. No handler hand-rolls auth or
// reads the service-role key inline (arch-gate: "Edge functions must not hand-roll auth"). Identity is
// the user's Bearer JWT, verified with the anon client; the profile is then loaded with the service
// role and must be `active` (or `invited` where the caller allows it). Access is decided from the
// profiles table, never a possibly-stale token claim (Phase 1 plan, sections 2 and 4).

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { AppError } from "./errors.ts";

export function getAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// The visitor address. Trust x-client-ip ONLY when x-internal-call-secret matches INTERNAL_CALL_SECRET
// (the Next.js server sends both). Otherwise fall back to the connecting address, so a caller cannot
// spoof the address used for per-IP rate limits or the audit event's `ip` (section 4).
export function clientIp(req: Request, connectingIp: string | null): string | null {
  const secret = Deno.env.get("INTERNAL_CALL_SECRET");
  const sent = req.headers.get("x-internal-call-secret");
  if (secret && sent && sent === secret) {
    return req.headers.get("x-client-ip") ?? connectingIp;
  }
  return connectingIp;
}

// Constant-time string compare, so verifying a shared secret does not leak it one character at a time
// through response timing. Length is allowed to differ fast (it is not itself the secret).
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// The pre-authentication functions (sign-in-check, auth-event) run before a user has any session, so they
// cannot be gated by a user JWT. They are callable only by the TrackPoli server, which sends the shared
// INTERNAL_CALL_SECRET; a browser or any other caller is refused. This keeps auth composed in _shared
// rather than hand-rolled per handler (AGENTS.md).
export function assertInternalCall(req: Request): void {
  const secret = Deno.env.get("INTERNAL_CALL_SECRET");
  const sent = req.headers.get("x-internal-call-secret");
  if (!secret || !sent || !safeEqual(sent, secret)) {
    throw new AppError("forbidden", "This endpoint is callable only by the TrackPoli server");
  }
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// The lockout key is the SHA-256 hex of the lower-cased email, so no address is stored (migration 010).
export function emailHash(email: string): Promise<string> {
  return sha256Hex(email.trim().toLowerCase());
}

// Read the `aal` claim from an already-verified JWT (getUser has validated the signature; this only
// reads the payload). Returns "aal1" when absent.
function readAal(jwt: string): string {
  try {
    const payload = jwt.split(".")[1];
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.aal === "string" ? json.aal : "aal1";
  } catch {
    return "aal1";
  }
}

export type Caller = {
  userId: string;
  role: "admin" | "admin_manager";
  status: "invited" | "active" | "deactivated";
  email: string;
  displayName: string;
  aal: string;
};

export async function verifyCaller(
  req: Request,
  opts: { requireAal2?: boolean; allowInvited?: boolean } = {},
): Promise<Caller> {
  const authz = req.headers.get("Authorization") ?? "";
  const jwt = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  if (!jwt) throw new AppError("unauthenticated", "Missing bearer token");

  const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    auth: { persistSession: false },
  });
  const { data: userData, error } = await anon.auth.getUser(jwt);
  if (error || !userData.user) throw new AppError("unauthenticated", "Invalid token");

  const admin = getAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role,status,email,display_name")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (!profile) throw new AppError("forbidden", "No administrator profile for this user");

  const active = profile.status === "active";
  const invitedOk = opts.allowInvited === true && profile.status === "invited";
  if (!active && !invitedOk) throw new AppError("forbidden", "Account is not active");

  const aal = readAal(jwt);
  if (opts.requireAal2 && aal !== "aal2") {
    throw new AppError("mfa_required", "A verified two-factor session is required");
  }

  return {
    userId: userData.user.id,
    role: profile.role,
    status: profile.status,
    email: profile.email,
    displayName: profile.display_name,
    aal,
  };
}
