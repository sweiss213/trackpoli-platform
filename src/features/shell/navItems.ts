// The admin side-nav model (TP1-06; Figma 805:19276), as pure data + a pure role filter so the
// "manager nav hidden for Administrators" rule is unit-tested without rendering. The SideNav component
// renders this; hiding a manager entry is a UX convenience, NEVER the security boundary — an Administrator
// who types the URL still hits the middleware role gate, the API 403 and RLS (ADR-0012).
//
// Badge counts (Review 12, Activity 3) are design placeholders until the real workflow data lands; they are
// not wired to a source in this ticket.

import { MANAGER_ROLE, type AdminRole } from "@/lib/roles";

export interface NavLeaf {
  readonly label: string;
  readonly href: string;
  readonly badge?: number;
}

export type NavNode =
  | { readonly kind: "item"; readonly label: string; readonly href: string; readonly icon: string; readonly managerOnly?: boolean }
  | { readonly kind: "section"; readonly label: string; readonly icon: string; readonly items: readonly NavLeaf[] };

// Icon keys resolve to SVG assets in the SideNav component (kept out of this pure module).
export const NAV: readonly NavNode[] = [
  { kind: "item", label: "Dashboard", href: "/", icon: "dashboard" },
  {
    kind: "section",
    label: "Records",
    icon: "records",
    items: [
      { label: "Politicians", href: "/politicians" },
      { label: "Parties", href: "/parties" },
      { label: "Bills", href: "/bills" },
      { label: "Policies", href: "/policies" },
      { label: "Sources", href: "/sources" },
      { label: "Promises", href: "/promises" },
    ],
  },
  {
    kind: "section",
    label: "Workflow",
    icon: "workflow",
    items: [
      { label: "Review", href: "/review", badge: 12 },
      { label: "Import", href: "/import" },
      { label: "Activity", href: "/activity", badge: 3 },
      { label: "Recently deleted", href: "/recently-deleted" },
    ],
  },
  { kind: "item", label: "Admin management", href: "/admins", icon: "admin", managerOnly: true },
  { kind: "item", label: "Settings", href: "/settings", icon: "settings" },
];

/** The nav a given role should see: manager-only top-level items are dropped for a non-manager (null = drop). */
export function filterNavForRole(role: AdminRole | null, nav: readonly NavNode[] = NAV): NavNode[] {
  return nav.filter((node) => !(node.kind === "item" && node.managerOnly && role !== MANAGER_ROLE));
}

/** Flat list of every { href, label } in the nav, for breadcrumb/active-state lookups. */
export function navLabelByHref(nav: readonly NavNode[] = NAV): Map<string, string> {
  const map = new Map<string, string>();
  for (const node of nav) {
    if (node.kind === "item") map.set(node.href, node.label);
    else for (const leaf of node.items) map.set(leaf.href, leaf.label);
  }
  return map;
}
