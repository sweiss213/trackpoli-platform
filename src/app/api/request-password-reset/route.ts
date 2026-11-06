// POST /admin/api/request-password-reset — the one server endpoint the forgot-password screen calls. It
// stays thin: validate the body, resolve the caller IP from the trusted Cloudflare header, delegate to
// performPasswordReset (which owns the bot-check/rate-limit handling and the enumeration-resistant timing),
// and return the typed outcome as a 200 body (sent | blocked). "sent" is returned whether or not the email
// has an account, so nothing here reveals account existence (ADR-0008). A malformed body is treated as a
// generic "sent" rather than leaking validation detail.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  buildRequestResetPorts,
  performPasswordReset,
  type RequestResetResult,
} from "@/features/auth/passwordReset";

const Body = z
  .object({
    email: z.string().email(),
    turnstileToken: z.string(),
  })
  .strict();

function callerIp(request: NextRequest): string | null {
  // CF-Connecting-IP is set by Cloudflare and trusted at the edge (Q-1-18); x-forwarded-for is the
  // local-dev fallback. Never trust a client-supplied value beyond these.
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null
  );
}

export async function POST(request: NextRequest) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const result: RequestResetResult = { outcome: "sent" };
    return NextResponse.json(result);
  }

  const ip = callerIp(request);
  const result = await performPasswordReset({ ...parsed.data, ip }, buildRequestResetPorts());
  return NextResponse.json(result);
}
