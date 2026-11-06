// Server-only client for the pre-authentication Edge Functions (sign-in-check, auth-event). The browser
// never calls these; the TrackPoli server does, carrying the anon key (for the Supabase gateway) plus the
// shared INTERNAL_CALL_SECRET and the real caller IP. Secrets are read from server env only. This is the
// one place that composes the call, so a handler/route never hand-rolls it.

import { internalCallSecret, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";

/** A non-ok envelope from an Edge Function, carrying its error code so callers can branch. */
export class EdgeFunctionError extends Error {
  readonly code: string;
  readonly retryAfterSeconds?: number;
  constructor(code: string, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "EdgeFunctionError";
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

type Envelope<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

export async function invokeInternalFunction<T>(
  name: "sign-in-check" | "auth-event",
  body: Record<string, unknown>,
  ip: string | null,
): Promise<T> {
  const anon = supabaseAnonKey();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${anon}`,
    apikey: anon,
    "x-internal-call-secret": internalCallSecret(),
  };
  if (ip) headers["x-client-ip"] = ip;

  const response = await fetch(`${supabaseUrl()}/functions/v1/${name}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const envelope = (await response.json().catch(() => null)) as Envelope<T> | null;
  if (!envelope) {
    throw new EdgeFunctionError("internal", `Malformed response from ${name}`);
  }
  if (!envelope.ok) {
    const retryAfter = Number(response.headers.get("Retry-After")) || undefined;
    throw new EdgeFunctionError(envelope.error.code, envelope.error.message, retryAfter);
  }
  return envelope.data;
}
