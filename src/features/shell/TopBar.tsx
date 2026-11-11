"use client";

// The admin shell top bar (TP1-06, migrated to Tailwind/shadcn in TP1-07; Figma 805:19276). A menu button
// (below 1024px only) that opens the nav drawer, a breadcrumb on the left, and the user chip on the right.
// The breadcrumb reflects the current path, except on the error screens (/forbidden, /not-found), where it
// reflects the ATTEMPTED path carried in ?from so the "Admin management › …" context shows. Presentation
// only; role/email come from AuthProvider (useAuth). Colour via semantic tokens; the menu is a shadcn Button.

import type { Ref } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Menu } from "lucide-react";

import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/useAuth";
import { roleLabel } from "@/lib/roles";
import { navLabelByHref } from "./navItems";
import { shellStrings } from "./strings";
import homeIcon from "./assets/breadcrumb-home.svg";

function normalise(path: string): string {
  if (path.startsWith("/admin")) return path.slice("/admin".length) || "/";
  return path;
}

function titleCase(segment: string): string {
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function initials(name: string): string {
  const letters = name.replace(/[^a-zA-Z]/g, "");
  return (letters.slice(0, 2) || "AD").toUpperCase();
}

export function TopBar({
  displayName,
  onMenu,
  menuExpanded = false,
  menuRef,
}: {
  displayName: string;
  onMenu?: () => void;
  menuExpanded?: boolean;
  menuRef?: Ref<HTMLButtonElement>;
}) {
  const { user } = useAuth();
  const pathname = usePathname() ?? "/";
  const params = useSearchParams();

  const onError = pathname.endsWith("/forbidden") || pathname.endsWith("/not-found");
  const source = onError && params.get("from") ? params.get("from")! : pathname;
  const path = normalise(source);
  const labels = navLabelByHref();

  const crumbs: string[] = [];
  if (path === "/") {
    crumbs.push(shellStrings.breadcrumb.home);
  } else {
    let acc = "";
    for (const seg of path.split("/").filter(Boolean)) {
      acc += `/${seg}`;
      crumbs.push(labels.get(acc) ?? titleCase(seg));
    }
  }

  const bodySmall =
    "text-[length:var(--md-body-small-size)] leading-[var(--md-body-small-line)] tracking-[var(--md-body-small-tracking)]";

  return (
    <header className="flex h-[68px] shrink-0 items-center gap-3 border-b border-border bg-[var(--md-surface)] px-4 sm:px-8">
      {onMenu ? (
        <Button
          ref={menuRef}
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 lg:hidden"
          aria-label={shellStrings.nav.openMenu}
          aria-expanded={menuExpanded}
          onClick={onMenu}
        >
          <Menu className="h-6 w-6" aria-hidden="true" />
        </Button>
      ) : null}

      <nav aria-label={shellStrings.breadcrumb.navLabel} className="flex min-w-0 items-center gap-2">
        <Icon src={homeIcon} size={18} />
        {crumbs.map((label, i) => (
          <span key={i} className={`inline-flex items-center gap-2 whitespace-nowrap text-muted-foreground ${bodySmall}`}>
            {i > 0 ? (
              <span className="text-muted-foreground" aria-hidden="true">
                ›
              </span>
            ) : null}
            {label}
          </span>
        ))}
      </nav>

      <div className="flex-1" />

      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full bg-accent text-foreground ${bodySmall}`}
          aria-hidden="true"
        >
          {initials(displayName)}
        </span>
        <span className="hidden flex-col sm:flex">
          <span className={`whitespace-nowrap text-foreground ${bodySmall}`}>{displayName}</span>
          <span className={`whitespace-nowrap text-muted-foreground ${bodySmall}`}>{roleLabel(user?.role ?? null)}</span>
        </span>
      </div>
    </header>
  );
}
