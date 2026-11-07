// POST /admin/api/mfa/replace — the device-replacement endpoint the Security-tab modal calls (ADR-0009).
// Reached only by a signed-in aal2 administrator. Thin: validate the body, derive the re-auth proof, delegate
// to the mfa cores, and return the typed outcome.
//
//   step=authorize method=password -> re-auth with the current password + current code
//   step=authorize method=google   -> re-auth proven by the HMAC marker set at /auth/reauth/callback + code
//   step=complete                   -> verify the new device's code, then drop the old factor
//
// The session alone is never trusted: authorize always re-authenticates (OWASP MFA "Changing MFA factors").

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  authorizeReplacement,
  buildReplacePorts,
  completeReplacement,
  type AuthorizeReplacementResult,
  type CompleteReplacementResult,
} from "@/features/auth/mfa";
import { createServerSupabase } from "@/lib/supabase/server";
import { REAUTH_MARKER_COOKIE, verifyReauthMarker } from "@/lib/reauthMarker";

const SixDigits = z.string().regex(/^\d{6}$/);

const Body = z.discriminatedUnion("step", [
  z.object({ step: z.literal("authorize"), method: z.literal("password"), password: z.string().min(1), currentCode: SixDigits }).strict(),
  z.object({ step: z.literal("authorize"), method: z.literal("google"), currentCode: SixDigits }).strict(),
  z.object({ step: z.literal("complete"), newFactorId: z.string().min(1), newCode: SixDigits }).strict(),
]);

export async function POST(request: NextRequest) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const result: AuthorizeReplacementResult = { outcome: "reauth_failed" };
    return NextResponse.json(result);
  }
  const body = parsed.data;
  const ports = buildReplacePorts();

  if (body.step === "complete") {
    const result: CompleteReplacementResult = await completeReplacement(
      { newFactorId: body.newFactorId, newCode: body.newCode },
      ports,
    );
    return NextResponse.json(result);
  }

  if (body.method === "google") {
    // The Google re-auth proof is the fresh, user-bound marker set by the re-auth callback.
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const cookieStore = await cookies();
    const verified = Boolean(
      user && verifyReauthMarker(cookieStore.get(REAUTH_MARKER_COOKIE)?.value, user.id),
    );
    const result = await authorizeReplacement(
      { proof: { kind: "google", verified }, currentCode: body.currentCode },
      ports,
    );
    return NextResponse.json(result);
  }

  const result = await authorizeReplacement(
    { proof: { kind: "password", password: body.password }, currentCode: body.currentCode },
    ports,
  );
  return NextResponse.json(result);
}
