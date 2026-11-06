// POST /admin/api/reset-password — finishes a password reset on the recovery session established by the
// /auth/confirm Continue page. Thin: validate the new password against the shared policy, resolve the
// caller IP, delegate to completePasswordReset (which requires the recovery session, applies the password,
// clears the lockout, writes the completion event, and ends all sessions — no auto-login, ADR-0008), and
// return the typed outcome. A password below the policy is reported as weak without touching the account.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  buildCompleteResetPorts,
  completePasswordReset,
  type CompleteResetResult,
} from "@/features/auth/passwordReset";

// Minimum 12 characters (NFR-S2), matching Supabase's minimum_password_length and the sign-in policy.
const Body = z
  .object({
    password: z.string().min(12),
  })
  .strict();

function callerIp(request: NextRequest): string | null {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null
  );
}

export async function POST(request: NextRequest) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const result: CompleteResetResult = { outcome: "weak_password" };
    return NextResponse.json(result);
  }

  const ip = callerIp(request);
  const result = await completePasswordReset(
    { password: parsed.data.password, ip, requestId: crypto.randomUUID() },
    buildCompleteResetPorts(),
  );
  return NextResponse.json(result);
}
