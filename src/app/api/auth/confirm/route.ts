// POST /admin/api/auth/confirm — exchanges a single-use email token for a session, invoked only when the
// recipient clicks Continue on the /auth/confirm page (ADR-0008). Exchanging on this explicit POST, rather
// than on a GET of the email link, is what stops an email security scanner from consuming the one-time
// token. On success the recovery (or invite) session is established on the cookie-bound client; the client
// then navigates to the reset screen. A used/expired/invalid token is reported generically as "expired";
// an unexpected failure as "error". Nothing about the token is echoed back.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";

const Body = z
  .object({
    tokenHash: z.string().min(1),
    // The Supabase email OTP types; recovery is this ticket's case, the others are for the shared TP1-09 use.
    type: z
      .enum(["recovery", "invite", "magiclink", "signup", "email", "email_change"])
      .default("recovery"),
  })
  .strict();

type ConfirmResult = { outcome: "ok" } | { outcome: "expired" } | { outcome: "error" };

export async function POST(request: NextRequest) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    // No usable token — treat as an invalid/expired link rather than leaking validation detail.
    return NextResponse.json({ outcome: "expired" } satisfies ConfirmResult);
  }

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: parsed.data.tokenHash,
      type: parsed.data.type,
    });
    if (error) {
      // Used, expired, or invalid link — one generic outcome (no detail that could aid an attacker).
      return NextResponse.json({ outcome: "expired" } satisfies ConfirmResult);
    }
    return NextResponse.json({ outcome: "ok" } satisfies ConfirmResult);
  } catch {
    return NextResponse.json({ outcome: "error" } satisfies ConfirmResult);
  }
}
