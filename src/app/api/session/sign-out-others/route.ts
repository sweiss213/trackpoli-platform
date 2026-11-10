// POST /admin/api/session/sign-out-others — "Sign out everywhere else" (TP1-05, user story 2). Revokes the
// administrator's OTHER sessions (Supabase scope "others"), leaving this one signed in, so a password or a
// forgotten device on another machine can be cut off without signing yourself out. This enforces the
// simultaneous-login policy OWASP Session Management asks for; it is the designed "Active sessions" card's
// bulk action. Requires a live session (an anonymous caller gets 401), and reports a failure rather than
// swallowing it (decisions.md), while still answering so the UI can show a clean outcome.

import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { report } from "@/lib/report";

export async function POST() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, reason: "no-session" }, { status: 401 });
  }

  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) {
    report("warning", "sign-out-others failed", { reason: error.message });
    return NextResponse.json({ ok: false, reason: "error" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
