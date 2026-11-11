"use client";

// Shared centred error-state content (TP1-06; Figma 1221:2596 / 1221:2776): an icon chip, a heading, a body,
// a code chip, and up to two actions. The forbidden (403) and not-found (404) screens both render this inside
// the app shell. Presentation only.

import Link from "next/link";
import type { StaticImageData } from "next/image";
import { Icon } from "@/components/ui/Icon";
import styles from "./ErrorState.module.css";

export interface ErrorAction {
  readonly label: string;
  readonly href?: string;
  readonly onClick?: () => void;
}

export function ErrorState({
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
    <div className={styles.wrap}>
      <div className={styles.frame}>
        <span className={styles.iconChip}>
          <Icon src={icon} size={34} />
        </span>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.body}>{body}</p>
        <span className={styles.code}>{code}</span>
        <div className={styles.actions}>
          {renderAction(primary, styles.primary)}
          {secondary ? renderAction(secondary, styles.secondary) : null}
        </div>
      </div>
    </div>
  );
}

function renderAction(action: ErrorAction, className: string) {
  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {action.label}
      </Link>
    );
  }
  return (
    <button type="button" className={className} onClick={action.onClick}>
      {action.label}
    </button>
  );
}
