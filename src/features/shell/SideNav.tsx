"use client";

// The admin side navigation (TP1-06, migrated to shadcn/Tailwind in TP1-07; Figma 805:19276). Renders the
// pure NAV model filtered for the current role — the manager-only "Admin management" entry is hidden for an
// Administrator — with the active item from the current path, collapsible Records/Workflow sections, and the
// user block + Log out. Hiding a manager entry is a UX convenience ONLY; the middleware role gate, the API
// 403 and RLS are the security (ADR-0012). Role comes from AuthProvider (useAuth); no auth decision here.
//
// Colour/shape come only from the semantic MD3 token utilities (no literal, no CSS module). Interactive
// controls are the shadcn Button and NavItem (design system), so the raw-control + css-module waivers retire.

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/apiFetch";
import { report } from "@/lib/report";
import { useAuth } from "@/features/auth/useAuth";
import { roleLabel } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { filterNavForRole, type NavNode } from "./navItems";
import { NavItem } from "./NavItem";
import { shellStrings } from "./strings";
import collapseIcon from "./assets/left-panel-close.svg";
import chevronIcon from "./assets/chevron-down.svg";
import userIcon from "./assets/user.svg";
import dashboardIcon from "./assets/nav-dashboard.svg";
import recordsIcon from "./assets/nav-records.svg";
import workflowIcon from "./assets/nav-workflow.svg";
import adminIcon from "./assets/nav-admin.svg";
import settingsIcon from "./assets/nav-settings.svg";

const ICONS: Record<string, typeof dashboardIcon> = {
  dashboard: dashboardIcon,
  records: recordsIcon,
  workflow: workflowIcon,
  admin: adminIcon,
  settings: settingsIcon,
};

/** Strip the /admin basePath so paths compare against the nav hrefs. */
function normalise(path: string): string {
  if (path.startsWith("/admin")) return path.slice("/admin".length) || "/";
  return path;
}

export function SideNav({
  displayName,
  collapsed = false,
  onToggleCollapsed,
  onNavigate,
}: {
  displayName: string;
  /** Desktop icon-rail collapse (controlled by AppShell); omit for an always-expanded drawer. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  /** Called when a nav link is activated (closes the mobile drawer). */
  onNavigate?: () => void;
}) {
  const { user } = useAuth();
  const pathname = normalise(usePathname() ?? "/");
  const nav = useMemo(() => filterNavForRole(user?.role ?? null), [user?.role]);
  const [open, setOpen] = useState<Record<string, boolean>>({ Records: true, Workflow: true });
  const [signingOut, setSigningOut] = useState(false);

  function isActive(href: string): boolean {
    return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  }

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await apiFetch("/admin/api/sign-out", { method: "POST" });
    } catch (error) {
      report("debug", "nav sign-out failed", { reason: error instanceof Error ? error.message : String(error) });
    }
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload so cleared session cookies apply
    window.location.assign("/admin/sign-in");
  }

  return (
    <nav
      aria-label={shellStrings.nav.primaryLabel}
      data-collapsed={collapsed}
      className={cn(
        "box-border flex h-[100dvh] flex-col gap-1 overflow-y-auto border-r border-ring bg-card px-3 py-6",
        collapsed ? "w-[76px]" : "w-[280px]",
      )}
    >
      <div className="box-border flex w-full items-center gap-2.5 px-1 pb-3">
        <span className="h-8 w-8 shrink-0 rounded-[8px] border border-dashed border-ring bg-accent" aria-hidden="true" />
        {!collapsed ? (
          <span className="whitespace-nowrap text-[length:var(--md-title-medium-size)] font-medium leading-[var(--md-title-medium-line)] tracking-[var(--md-title-medium-tracking)] text-foreground">
            {shellStrings.appName}
          </span>
        ) : null}
        {!collapsed ? <span className="flex-1" /> : null}
        {onToggleCollapsed ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label={collapsed ? shellStrings.nav.expandRail : shellStrings.nav.collapseRail}
            aria-pressed={collapsed}
            onClick={onToggleCollapsed}
          >
            <Icon src={collapseIcon} size={24} />
          </Button>
        ) : null}
      </div>

      <ul className="m-0 flex w-full list-none flex-col gap-1 p-0">{nav.map((node) => renderNode(node))}</ul>

      <div className="mt-auto box-border flex w-full items-center gap-2.5 border-t border-border px-2 pt-3">
        <span className="flex shrink-0">
          <Icon src={userIcon} size={36} />
        </span>
        {!collapsed ? (
          <span className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <span className="truncate text-[length:var(--md-body-medium-size)] leading-[var(--md-body-medium-line)] tracking-[var(--md-body-medium-tracking)] text-foreground">
              {displayName}
            </span>
            <span className="truncate text-[length:var(--md-body-small-size)] leading-[var(--md-body-small-line)] tracking-[var(--md-body-small-tracking)] text-muted-foreground">
              {roleLabel(user?.role ?? null)}
            </span>
          </span>
        ) : null}
        {!collapsed ? (
          <Button
            type="button"
            variant="ghost"
            className="h-auto shrink-0 rounded-full px-3 py-2 text-[length:var(--md-label-large-size)] font-medium tracking-[var(--md-label-large-tracking)] text-foreground"
            onClick={signOut}
            disabled={signingOut}
          >
            {shellStrings.user.signOut}
          </Button>
        ) : null}
      </div>
    </nav>
  );

  function renderNode(node: NavNode) {
    if (node.kind === "item") {
      return (
        <li key={node.href}>
          <NavItem
            href={node.href}
            label={node.label}
            active={isActive(node.href)}
            collapsed={collapsed}
            icon={<Icon src={ICONS[node.icon]} size={24} />}
            onNavigate={onNavigate}
          />
        </li>
      );
    }
    const expanded = open[node.label] ?? true;
    return (
      <li key={node.label} className="flex w-full flex-col gap-0.5 pt-2">
        <Button
          type="button"
          variant="ghost"
          aria-expanded={expanded}
          onClick={() => setOpen((o) => ({ ...o, [node.label]: !expanded }))}
          className={cn(
            "h-auto w-full justify-start gap-2 rounded-full py-2 pl-4 pr-3 text-left",
            "text-[length:var(--md-label-large-size)] font-semibold leading-[var(--md-label-large-line)] tracking-[var(--md-label-large-tracking)] text-foreground",
            collapsed && "justify-center px-3",
          )}
        >
          <Icon src={ICONS[node.icon]} size={24} />
          {!collapsed ? <span className="min-w-0 flex-1 truncate text-left">{node.label}</span> : null}
          {!collapsed ? (
            <span
              className={cn("flex shrink-0 transition-transform", !expanded && "-rotate-90")}
              aria-hidden="true"
            >
              <Icon src={chevronIcon} size={24} />
            </span>
          ) : null}
        </Button>
        {expanded && !collapsed ? (
          <ul className="m-0 ml-7 flex list-none flex-col gap-0.5 border-l border-border p-0 pl-3">
            {node.items.map((leaf) => (
              <li key={leaf.href}>
                <NavItem
                  href={leaf.href}
                  label={leaf.label}
                  active={isActive(leaf.href)}
                  badge={leaf.badge}
                  variant="sub"
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>
        ) : null}
      </li>
    );
  }
}
