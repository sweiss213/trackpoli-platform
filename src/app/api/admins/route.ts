// GET /admin/api/admins — the manager-only administrator list (TP1-06, E2E-08). Thin: delegates to the
// listAdmins service and maps its outcome to a status. An Administrator calling this directly gets 403
// (role check), and RLS returns no manager rows regardless; only an administrator manager gets the list.

import { NextResponse } from "next/server";
import { listAdmins } from "@/features/admins/listAdmins";

export async function GET() {
  const result = await listAdmins();
  switch (result.outcome) {
    case "ok":
      return NextResponse.json({ admins: result.admins });
    case "unauthenticated":
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    case "forbidden":
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    default:
      return NextResponse.json({ error: "error" }, { status: 502 });
  }
}
