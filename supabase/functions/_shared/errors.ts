// Error taxonomy and the JSON response envelope shared by every TrackPoli Edge Function.
// Contract: success -> 200 { ok: true, data }, failure -> { ok: false, error: { code, message, field? } }
// with the HTTP status below (Phase 1 plan, section 4). These helpers live in _shared so no handler
// hand-rolls a response (arch-gate: "Edge functions must not hand-roll CORS or responses").

export type ErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "mfa_required"
  | "validation_failed"
  | "not_found"
  | "conflict"
  | "email_in_use"
  | "last_manager"
  | "cannot_target_self"
  | "rate_limited"
  | "terms_required"
  | "internal";

const STATUS: Record<ErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  mfa_required: 403,
  validation_failed: 422,
  not_found: 404,
  conflict: 409,
  email_in_use: 409,
  last_manager: 409,
  cannot_target_self: 409,
  rate_limited: 429,
  terms_required: 403,
  internal: 500,
};

export function statusFor(code: ErrorCode): number {
  return STATUS[code];
}

// Expected failures (401/403/404/409/422/429) are NOT logged as operational errors; only `internal` is
// reported to the operational log and Sentry (section 4).
export function isExpected(code: ErrorCode): boolean {
  return code !== "internal";
}

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly field?: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}

type ResponseInit2 = { requestId: string; headers?: Record<string, string> };

export function jsonOk(data: unknown, init: ResponseInit2): Response {
  return new Response(JSON.stringify({ ok: true, data }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "x-request-id": init.requestId,
      ...(init.headers ?? {}),
    },
  });
}

export function jsonError(err: AppError, init: ResponseInit2): Response {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-request-id": init.requestId,
    ...(init.headers ?? {}),
  };
  if (err.code === "rate_limited" && err.retryAfterSeconds) {
    headers["Retry-After"] = String(err.retryAfterSeconds);
  }
  const error: { code: ErrorCode; message: string; field?: string } = {
    code: err.code,
    message: err.message,
  };
  if (err.field) error.field = err.field;
  return new Response(JSON.stringify({ ok: false, error }), { status: statusFor(err.code), headers });
}
