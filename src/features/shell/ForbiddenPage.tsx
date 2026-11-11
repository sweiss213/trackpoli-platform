"use client";

// The 403 forbidden screen (TP1-06; Figma 1221:2431). Shown inside the app shell when a session reaches a
// route its role may not open — in this ticket, an Administrator on a manager-only route. The copy is
// role-aware (the design's "super administrators" was a misnomer; the role is Administrator manager), and the
// code chip shows the attempted path from ?from. This screen is UX only; the manager API returns 403 and RLS
// returns no rows regardless (ADR-0012).

import { useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/useAuth";
import { roleLabel } from "@/lib/roles";
import { ErrorScreen } from "./ErrorScreen";
import forbiddenIcon from "./assets/forbidden.svg";

export function ForbiddenPage() {
  const { user } = useAuth();
  const params = useSearchParams();
  const from = params.get("from");

  return (
    <ErrorScreen
      icon={forbiddenIcon}
      title="You don't have access to this page"
      body={`This section is limited to Administrator managers. Your ${roleLabel(user?.role ?? null)} account doesn't include permission to open it.`}
      code={`Error 403 · Forbidden · ${from ?? "this page"}`}
      primary={{ label: "Back to dashboard", href: "/" }}
      secondary={{ label: "Request access", href: "/settings" }}
    />
  );
}
