// POST /admin/api/mfa/enrol — the enrolment endpoint the forced-enrolment screen calls (ADR-0009). It is
// reachable at aal1 (the MFA funnel is exempt from RequireMfa) but still requires a signed-in session,
// which the cookie-bound Supabase client enforces. Thin: validate the body, delegate to the mfa core, and
// return the typed outcome as a 200 body so the screen can render the QR (begin) or the next state
// (confirm). A wrong code is a business outcome, not a transport error.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  beginEnrolment,
  buildMfaPorts,
  confirmEnrolment,
  type EnrolConfirmResult,
  type EnrolStart,
} from "@/features/auth/mfa";
import { createServerSupabase } from "@/lib/supabase/server";

const Body = z.discriminatedUnion("step", [
  z.object({ step: z.literal("begin") }).strict(),
  z.object({ step: z.literal("confirm"), factorId: z.string().min(1), code: z.string().regex(/^\d{6}$/) }).strict(),
]);

export async function POST(request: NextRequest) {
  // The setup session can lapse while the enrolment screen is open (inactivity sign-out). Detect it here so
  // the screen shows the branded "setup session expired" state instead of a misleading wrong-code message.
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "session_expired" }, { status: 401 });
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    // A malformed confirm body (e.g. a non-numeric code) is just an invalid code to the screen.
    const result: EnrolConfirmResult = { outcome: "invalid_code" };
    return NextResponse.json(result);
  }

  const ports = buildMfaPorts();
  if (parsed.data.step === "begin") {
    const start: EnrolStart = await beginEnrolment(ports);
    return NextResponse.json(start);
  }
  const result = await confirmEnrolment({ factorId: parsed.data.factorId, code: parsed.data.code }, ports);
  return NextResponse.json(result);
}
