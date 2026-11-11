import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// NavItem — one navigation entry (TP1-07, extracted from the TP1-06 SideNav; Figma 805:19276). Pure and
// presentational: the parent computes `active` from the path and passes it in. A link, not a button, so it
// is a real navigation control; aria-current="page" marks the active one for assistive tech
// (universal-accessibility-wcag). Colour comes only from the semantic MD3 token utilities — no literal.
//
// `variant` switches between a top-level item and an indented sub-item; `collapsed` hides the label/badge
// for the icon-only rail. Hrefs are app-relative (e.g. "/politicians") and passed straight to next/link:
// Next adds the /admin basePath automatically, so prefixing it here would double-prefix to /admin/admin/...
// (404, ADR-0014). The arch-gate forbids a literal /admin in a Next-aware <Link href>.

export interface NavItemProps {
  /** App-relative href (without the /admin base), e.g. "/politicians". */
  href: string;
  label: string;
  active?: boolean;
  icon?: ReactNode;
  badge?: number;
  collapsed?: boolean;
  variant?: "item" | "sub";
  className?: string;
  /** Called when the link is activated (e.g. to close the mobile nav drawer). */
  onNavigate?: () => void;
}

export function NavItem({
  href,
  label,
  active = false,
  icon,
  badge,
  collapsed = false,
  variant = "item",
  className,
  onNavigate,
}: NavItemProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      // When collapsed there is no visible text, so the label must still be the link's accessible name.
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
      onClick={onNavigate}
      className={cn(
        "flex h-14 items-center gap-3 rounded-full no-underline outline-none transition-colors",
        "text-[length:var(--md-label-large-size)] font-medium leading-[var(--md-label-large-line)] tracking-[var(--md-label-large-tracking)]",
        "text-muted-foreground hover:bg-muted",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        variant === "sub" ? "px-6" : "px-4",
        collapsed && "justify-center px-3",
        active && "bg-secondary font-semibold text-secondary-foreground",
        className,
      )}
    >
      {icon ? <span className="flex shrink-0 items-center">{icon}</span> : null}
      {!collapsed ? <span className="min-w-0 flex-1 truncate">{label}</span> : null}
      {!collapsed && badge !== undefined ? (
        <span className="shrink-0 text-[length:var(--md-label-large-size)]">{badge}</span>
      ) : null}
    </Link>
  );
}
