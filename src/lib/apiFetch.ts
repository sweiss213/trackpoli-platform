// apiFetch — the single client-side seam for calling the admin app's own same-origin API routes (ADR-0005).
// The browser never calls Supabase directly and never holds a token; it calls our server routes, and the
// HttpOnly session cookie rides along automatically (credentials: "same-origin"). This wrapper centralises
// that, plus JSON encoding and a consistent error shape that reports through the app's reporting spine so a
// failed call is never silently swallowed (decisions.md, Error handling).

import { report } from "@/lib/report";

// Dispatched on the window when any API call comes back 401 (session gone). SessionGuard listens and lands
// the administrator on /session-expired (TP1-05). Only 401 maps to expiry: a 403 is an authorization denial
// (RLS/role), not an ended session, so it is left for the caller to surface rather than hidden behind a
// "session expired" screen.
export const SESSION_EXPIRED_EVENT = "trackpoli:session-expired";

/** A failed API call, carrying the HTTP status so callers can branch without re-parsing. */
export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export interface ApiFetchOptions {
  readonly method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  readonly body?: unknown;
  readonly signal?: AbortSignal;
}

/**
 * Call a same-origin admin API path (e.g. "/api/sign-in"). The path is resolved relative to the current
 * origin; never pass an absolute URL to another host from here. Returns the parsed JSON body typed as T;
 * throws ApiError on a non-2xx response or a transport failure.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = "GET", body, signal } = options;
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    // Transport-level failure (offline, aborted, DNS). Report and re-raise as a typed error the caller
    // can show generically; we recover the call site by giving it a stable error type.
    report("warning", "apiFetch transport failure", {
      path,
      method,
      reason: error instanceof Error ? error.message : String(error),
    });
    throw new ApiError("Network request failed", 0);
  }

  if (!response.ok) {
    report("warning", "apiFetch non-2xx response", { path, method, status: response.status });
    // A 401 means the session is gone; signal the session layer (SessionGuard) to land on /session-expired.
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    }
    throw new ApiError(`Request to ${path} failed`, response.status);
  }

  return (await response.json()) as T;
}
