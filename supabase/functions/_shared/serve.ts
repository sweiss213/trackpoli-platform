// The request lifecycle shared by every function, so each handler stays thin (AGENTS.md). It:
//   - answers the CORS preflight,
//   - generates a request_id and returns it in x-request-id on every response,
//   - resolves the caller address once (trusting x-client-ip only behind INTERNAL_CALL_SECRET),
//   - builds the privileged admin client,
//   - maps a thrown AppError to its JSON envelope, and any other throw to `internal`,
//   - reports ONLY unexpected (`internal`) failures to the operational log (never expected 4xx).
// A handler returns the success `data`; throwing an AppError is how it returns an expected failure.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { clientIp, getAdminClient } from "./auth.ts";
import { corsHeaders, handleCors } from "./cors.ts";
import { AppError, isExpected, jsonError, jsonOk } from "./errors.ts";
import { writeOperationalError } from "./events.ts";

export type HandlerContext = {
  req: Request;
  requestId: string;
  admin: SupabaseClient;
  ip: string | null;
};

export type Handler = (ctx: HandlerContext) => Promise<unknown>;

export function serve(component: string, handler: Handler): void {
  Deno.serve(async (req) => {
    const preflight = handleCors(req);
    if (preflight) return preflight;

    const requestId = crypto.randomUUID();
    const cors = corsHeaders(req.headers.get("Origin"));
    const forwarded = (req.headers.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || null;
    const ip = clientIp(req, forwarded);
    const admin = getAdminClient();

    try {
      const data = await handler({ req, requestId, admin, ip });
      return jsonOk(data, { requestId, headers: cors });
    } catch (thrown) {
      const err = thrown instanceof AppError ? thrown : new AppError("internal", "Unexpected error");
      if (!isExpected(err.code)) {
        // Report the unexpected failure, but never let a reporting failure mask the original error.
        await writeOperationalError(admin, {
          severity: "error",
          source: "edge_function",
          component,
          errorCode: err.code,
          message: err.message,
          httpStatus: 500,
          requestId,
          release: Deno.env.get("RELEASE") ?? null,
          environment: Deno.env.get("ENVIRONMENT") ?? null,
        }).catch(() => undefined);
      }
      return jsonError(err, { requestId, headers: cors });
    }
  });
}
