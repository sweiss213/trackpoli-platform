// POST /admin/api/mfa/verify — the sign-in step-up endpoint the verify screen calls (ADR-0009). The session
// is aal1 with a verified factor; a correct code lifts it to aal2 (Supabase issues the upgraded token, set
// on the HttpOnly cookie). Thin: validate, delegate to the mfa core, return the typed outcome. Reachable at
// aal1 (MFA funnel is exempt from RequireMfa) but requires a signed-in session via the cookie client.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { buildMfaPorts, verifySignInChallenge, type VerifyResult } from "@/features/auth/mfa";

const Body = z.object({ code: z.string().regex(/^\d{6}$/) }).strict();

export async function POST(request: NextRequest) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const result: VerifyResult = { outcome: "invalid_code" };
    return NextResponse.json(result);
  }

  const result = await verifySignInChallenge({ code: parsed.data.code }, buildMfaPorts());
  return NextResponse.json(result);
}
