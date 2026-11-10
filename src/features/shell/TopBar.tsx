"use client";

// The admin shell top bar (TP1-06; Figma 1221:2583): a breadcrumb on the left and the user chip on the right.
// The breadcrumb reflects the current path, except on the error screens (/forbidden, /not-found), where it
// reflects the ATTEMPTED path carried in ?from so the design's "Admin management › Billing" context shows.
// Presentation only; role/email come from AuthProvider (useAuth).

import { usePathname, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/features/auth/useAuth";
import { roleLabel } from "@/lib/roles";
import { navLabelByHref } from "./navItems";
import styles from "./TopBar.module.css";
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

export function TopBar({ displayName }: { displayName: string }) {
  const { user } = useAuth();
  const pathname = usePathname() ?? "/";
  const params = useSearchParams();

  const onError = pathname.endsWith("/forbidden") || pathname.endsWith("/not-found");
  const source = onError && params.get("from") ? params.get("from")! : pathname;
  const path = normalise(source);
  const labels = navLabelByHref();

  const crumbs: string[] = [];
  if (path === "/") {
    crumbs.push("Dashboard");
  } else {
    let acc = "";
    for (const seg of path.split("/").filter(Boolean)) {
      acc += `/${seg}`;
      crumbs.push(labels.get(acc) ?? titleCase(seg));
    }
  }

  return (
    <header className={styles.bar}>
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <Icon src={homeIcon} size={18} />
        {crumbs.map((label, i) => (
          <span key={i} className={styles.crumb}>
            {i > 0 ? <span className={styles.sep} aria-hidden="true">›</span> : null}
            {label}
          </span>
        ))}
      </nav>
      <div className={styles.spacer} />
      <div className={styles.userChip}>
        <span className={styles.avatar} aria-hidden="true">
          {initials(displayName)}
        </span>
        <span className={styles.userText}>
          <span className={styles.userName}>{displayName}</span>
          <span className={styles.userRole}>{roleLabel(user?.role ?? null)}</span>
        </span>
      </div>
    </header>
  );
}
