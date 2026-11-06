// POST /admin/api/sign-in — the one server endpoint the sign-in screen calls. It stays thin: validate the
// body, resolve the caller IP from the trusted Cloudflare header, delegate to performSignIn (which owns
// the bot-check/lockout/attempt order and the enumeration-resistant timing), and return the typed outcome.
// The outcome is returned as a 200 body (success | failed | locked | blocked) so the client can render the
// right state (generic error, remaining-attempts count, the locked screen) from one structured response;
// the failure is a business outcome, not an HTTP transport error, and nothing in it reveals which
// credential was wrong or whether the email exists (ADR-0005).

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { buildSignInPorts, performSignIn, type SignInResult } from "@/features/auth/signIn";

const Body = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
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
    // Treat a malformed body as a generic failure rather than leaking validation detail.
    const result: SignInResult = { outcome: "failed", attemptsRemaining: null };
    return NextResponse.json(result);
  }

  const ip = callerIp(request);
  const result = await performSignIn({ ...parsed.data, ip }, buildSignInPorts());
  return NextResponse.json(result);
}
