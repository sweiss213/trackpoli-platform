import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { shellStrings } from "./strings";

// PageHeader — the per-page title row (TP1-07; Figma record screens 943:88974). An <h1> page title with an
// optional actions cluster on the trailing side and an optional breadcrumb trail above it. One <h1> per page
// (universal-accessibility-wcag: a page has a single top-level heading); actions are passed as nodes so the
// caller composes design-system Buttons. Colour via semantic tokens. The shell's TopBar shows the global
// breadcrumb; a page may additionally pass `breadcrumbs` here when it wants an in-content trail.

export interface Crumb {
  label: string;
  href?: string;
}

export function PageHeader({
  title,
  actions,
  breadcrumbs,
  className,
}: {
  title: string;
  actions?: ReactNode;
  breadcrumbs?: Crumb[];
  className?: string;
}) {
  const bodySmall =
    "text-[length:var(--md-body-small-size)] leading-[var(--md-body-small-line)] tracking-[var(--md-body-small-tracking)]";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label={shellStrings.breadcrumb.navLabel} className="flex min-w-0 flex-wrap items-center gap-2">
          {breadcrumbs.map((crumb, i) => (
            <span key={`${crumb.label}-${i}`} className={cn("inline-flex items-center gap-2 text-muted-foreground", bodySmall)}>
              {i > 0 ? (
                <span className="text-muted-foreground" aria-hidden="true">
                  ›
                </span>
              ) : null}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="rounded-[2px] text-muted-foreground underline-offset-4 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current={i === breadcrumbs.length - 1 ? "page" : undefined}>{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[length:var(--md-headline-medium-size)] font-normal leading-[var(--md-headline-medium-line)] tracking-[var(--md-headline-medium-tracking)] text-foreground">
          {title}
        </h1>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
