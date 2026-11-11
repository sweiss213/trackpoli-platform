"use client";

// ErrorScreen — the full-page 403/404 content (TP1-06 ErrorState, renamed + migrated to shadcn/Tailwind in
// TP1-07 to avoid colliding with the generic ui/ErrorState and to retire the raw-control + css-module waivers;
// Figma 1221:2596 / 1221:2776). An icon chip, the page <h1>, a body, a code chip, and up to two actions. The
// forbidden (403) and not-found (404) screens render this inside the app shell. Actions are shadcn Buttons
// (a link uses asChild + Next Link); colour via semantic tokens — no literal, no CSS module.

import Link from "next/link";
import type { StaticImageData } from "next/image";

import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/button";

export interface ErrorAction {
  readonly label: string;
  readonly href?: string;
  readonly onClick?: () => void;
}

export function ErrorScreen({
  icon,
  title,
  body,
  code,
  primary,
  secondary,
}: {
  readonly icon: StaticImageData;
  readonly title: string;
  readonly body: string;
  readonly code: string;
  readonly primary: ErrorAction;
  readonly secondary?: ErrorAction;
}) {
  return (
    <div className="box-border flex min-h-full flex-1 items-center justify-center p-10">
      <div className="flex w-[480px] max-w-full flex-col items-center gap-[18px] text-center">
        <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-accent">
          <Icon src={icon} size={34} />
        </span>
        <h1 className="m-0 w-full text-[length:var(--md-headline-medium-size)] font-normal leading-[var(--md-headline-medium-line)] tracking-[var(--md-headline-medium-tracking)] text-foreground">
          {title}
        </h1>
        <p className="m-0 w-full text-[length:var(--md-body-medium-size)] leading-[var(--md-body-medium-line)] tracking-[var(--md-body-medium-tracking)] text-muted-foreground">
          {body}
        </p>
        <span className="inline-flex max-w-full items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-[8px] bg-accent px-3 py-1.5 text-[length:var(--md-body-small-size)] leading-[var(--md-body-small-line)] tracking-[var(--md-body-small-tracking)] text-muted-foreground">
          {code}
        </span>
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2">
          {renderAction(primary, "secondary")}
          {secondary ? renderAction(secondary, "ghost") : null}
        </div>
      </div>
    </div>
  );
}

function renderAction(action: ErrorAction, variant: "secondary" | "ghost") {
  if (action.href) {
    return (
      <Button asChild variant={variant} size="sm" className="h-12 px-6">
        <Link href={action.href}>{action.label}</Link>
      </Button>
    );
  }
  return (
    <Button type="button" variant={variant} size="sm" className="h-12 px-6" onClick={action.onClick}>
      {action.label}
    </Button>
  );
}
