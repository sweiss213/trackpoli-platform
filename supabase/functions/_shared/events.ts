// Audit and operational log writers. A privileged change and its audit event must not be separated:
// if writeEvent throws, the caller undoes the change and returns `internal` (Phase 1 plan, section 4).
// Both call security-definer functions that only the service role may execute (migrations 003, 009).

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import type { ErrorCode } from "./errors.ts";

export type AuditEvent = {
  actor: string | null; // null for anonymous events (e.g. a failed sign-in)
  action: string; // must match ^[a-z_]+\.[a-z_]+$ (checked by the DB)
  subjectType?: string | null;
  subjectId?: string | null;
  summary: string;
  details?: Record<string, unknown>;
  ip?: string | null;
  requestId: string;
};

// Writes exactly one row to activity_events via log_event, keeping the actor name/email snapshot.
export async function writeEvent(admin: SupabaseClient, e: AuditEvent): Promise<void> {
  const { error } = await admin.rpc("log_event", {
    p_actor: e.actor,
    p_action: e.action,
    p_subject_type: e.subjectType ?? null,
    p_subject_id: e.subjectId ?? null,
    p_summary: e.summary,
    p_details: e.details ?? {},
    p_ip: e.ip ?? null,
    p_request: e.requestId,
  });
  if (error) throw error;
}

export type OperationalError = {
  severity: "warning" | "error" | "critical";
  source: "edge_function" | "database" | "auth_hook" | "job";
  component: string; // function/trigger/job name — never an email, name, token or request body
  errorCode?: string | null;
  message: string;
  httpStatus?: number | null;
  requestId: string;
  release?: string | null;
  environment?: string | null;
  actor?: string | null; // id only
  // Only the allow-listed keys (route/method/function/attempt/upstream/sqlstate/retry_after) are kept
  // by log_error; anything else is dropped so personal data and secrets cannot slip in.
  context?: Record<string, unknown>;
};

// Writes one row to operational_events via log_error. Call ONLY for unexpected (`internal`) failures.
export async function writeOperationalError(admin: SupabaseClient, e: OperationalError): Promise<void> {
  await admin.rpc("log_error", {
    p_severity: e.severity,
    p_source: e.source,
    p_component: e.component,
    p_error_code: e.errorCode ?? null,
    p_message: e.message,
    p_http_status: e.httpStatus ?? null,
    p_duration_ms: null,
    p_request: e.requestId,
    p_release: e.release ?? null,
    p_environment: e.environment ?? null,
    p_actor: e.actor ?? null,
    p_context: e.context ?? {},
  });
}

// True for the error codes that are NOT written to the operational log (expected failures).
export function isExpectedCode(code: ErrorCode): boolean {
  return code !== "internal";
}
