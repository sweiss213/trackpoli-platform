// POST /admin/api/session/activity — the once-a-minute "I'm still here" ping (TP1-05). It re-stamps the
// signed, HttpOnly last-activity cookie that the edge middleware reads to enforce the idle limit, keeping the
// session's start fixed (the 4-hour absolute cap is anchored, not extended). It also answers the client with
// the session start, the server clock, and the limits, so SessionGuard can run the warning countdown against
// the server's timeline rather than guessing. The browser never reads the cookie (it is HttpOnly, ADR-0005);
// this endpoint is the only writer, so there is one owner of the last-activity fact.
//
// If the existing cookie is already past a limit, this refuses with 401 instead of re-stamping, so a late
// ping cannot resurrect a dead session — the client treats the 401 as expiry and lands on /session-expired.
// If the signing secret is missing or signing fails, it degrades gracefully to a 200 "no-session" (the same
// fail-open stance as the middleware), reported through the spine, rather than throwing an unhandled 500.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabase } from "@/lib/supabase/server";
import { hasSupabaseEnv, internalCallSecret } from "@/lib/supabase/config";
import { ACTIVITY_COOKIE, evaluateActivity, readActivity, signActivity } from "@/lib/sessionActivity";
import { sessionLimits } from "@/lib/config";
import { report } from "@/lib/report";

export async function POST() {
  const limits = sessionLimits();

  // Without Supabase env (local dev before secrets) there is no session to stamp; tell the client so it can
  // keep the UI reachable and simply not run the timeout.
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ ok: false, reason: "no-session" }, { status: 200 });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, reason: "no-session" }, { status: 401 });
  }

  const now = Date.now();
  let start: number;
  let value: string;
  try {
    const secret = internalCallSecret();
    const store = await cookies();
    const existing = await readActivity(store.get(ACTIVITY_COOKIE)?.value, secret);

    // A late ping must not revive an expired session.
    if (existing && evaluateActivity(existing, now, limits) !== "active") {
      return NextResponse.json({ ok: false, reason: "expired" }, { status: 401 });
    }

    start = existing && existing.start <= now ? existing.start : now;
    value = await signActivity({ start, last: now }, secret);
  } catch (error) {
    // A missing INTERNAL_CALL_SECRET (or a signing failure) must degrade like the middleware — no timeout
    // opinion — not throw an unhandled 500. Report it so the misconfiguration is visible to operators.
    report("warning", "activity cookie could not be stamped", {
      reason: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false, reason: "no-session" }, { status: 200 });
  }

  const response = NextResponse.json({ ok: true, startMs: start, nowMs: now, limits });
  response.cookies.set(ACTIVITY_COOKIE, value, {
    path: "/admin",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: Math.ceil(limits.absoluteMs / 1000),
  });
  return response;
}
