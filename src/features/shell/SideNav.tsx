"use client";

// The admin side navigation (TP1-06; Figma 805:19276 / 1221:2432). Renders the pure NAV model filtered for
// the current role — the manager-only "Admin management" entry is hidden for an Administrator — with the
// active item from the current path, collapsible Records/Workflow sections, and the user block + Log out.
// Hiding a manager entry is a UX convenience ONLY; the middleware role gate, the API 403 and RLS are the
// security (ADR-0012). Role comes from AuthProvider (useAuth); this component makes no auth decision.

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { apiFetch } from "@/lib/apiFetch";
import { report } from "@/lib/report";
import { useAuth } from "@/features/auth/useAuth";
import { roleLabel } from "@/lib/roles";
import { filterNavForRole, type NavNode } from "./navItems";
import styles from "./SideNav.module.css";
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

export function SideNav({ displayName }: { displayName: string }) {
  const { user } = useAuth();
  const pathname = normalise(usePathname() ?? "/");
  const nav = useMemo(() => filterNavForRole(user?.role ?? null), [user?.role]);
  const [open, setOpen] = useState<Record<string, boolean>>({ Records: true, Workflow: true });
  const [collapsed, setCollapsed] = useState(false);
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
    <nav className={styles.nav} aria-label="Admin" data-collapsed={collapsed}>
      <div className={styles.brand}>
        <span className={styles.logo} aria-hidden="true" />
        <span className={styles.brandName}>TrackPoli Admin</span>
        <span className={styles.brandSpacer} />
        <button
          type="button"
          className={styles.collapseButton}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          aria-pressed={collapsed}
          onClick={() => setCollapsed((c) => !c)}
        >
          <Icon src={collapseIcon} size={24} />
        </button>
      </div>

      <ul className={styles.list}>
        {nav.map((node) => renderNode(node))}
      </ul>

      <div className={styles.footer}>
        <span className={styles.userIcon}>
          <Icon src={userIcon} size={36} />
        </span>
        <span className={styles.userText}>
          <span className={styles.userName}>{displayName}</span>
          <span className={styles.userRole}>{roleLabel(user?.role ?? null)}</span>
        </span>
        <button type="button" className={styles.logout} onClick={signOut} disabled={signingOut}>
          Log out
        </button>
      </div>
    </nav>
  );

  function renderNode(node: NavNode) {
    if (node.kind === "item") {
      const active = isActive(node.href);
      return (
        <li key={node.href}>
          <Link href={node.href} className={styles.item} data-active={active} aria-current={active ? "page" : undefined}>
            <Icon src={ICONS[node.icon]} size={24} />
            <span className={styles.label}>{node.label}</span>
          </Link>
        </li>
      );
    }
    const expanded = open[node.label] ?? true;
    return (
      <li key={node.label} className={styles.section}>
        <button
          type="button"
          className={styles.sectionHeader}
          aria-expanded={expanded}
          onClick={() => setOpen((o) => ({ ...o, [node.label]: !expanded }))}
        >
          <Icon src={ICONS[node.icon]} size={24} />
          <span className={styles.sectionLabel}>{node.label}</span>
          <span className={styles.chevron} data-expanded={expanded} aria-hidden="true">
            <Icon src={chevronIcon} size={24} />
          </span>
        </button>
        {expanded && !collapsed ? (
          <ul className={styles.subList}>
            {node.items.map((leaf) => {
              const active = isActive(leaf.href);
              return (
                <li key={leaf.href}>
                  <Link href={leaf.href} className={styles.subItem} data-active={active} aria-current={active ? "page" : undefined}>
                    <span className={styles.label}>{leaf.label}</span>
                    {leaf.badge !== undefined ? <span className={styles.badge}>{leaf.badge}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </li>
    );
  }
}
