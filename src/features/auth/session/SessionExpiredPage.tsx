"use client";

// The session-expired screen (TP1-05; Figma 1211:2489). The browser lands here after a timeout: the idle
// limit (copy "expired after inactivity") or the 4-hour absolute cap (copy "reached its 4-hour limit"),
// chosen by the ?reason the middleware set. "Sign in again" returns to the sign-in screen, keeping the
// original path (?next) so the administrator comes back where they were — the return path is sanitised to an
// in-app /admin path so it can never be used as an open redirect (OWASP Unvalidated Redirects).
//
// On mount it fires a best-effort sign-out so the server session is actively destroyed even when the browser
// arrived here by a middleware redirect with no client running beforehand (OWASP Session Management: destroy
// the session, not just the cookie). Presentation + that one revoke; no session decision is made here.

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { apiFetch } from "@/lib/apiFetch";
import { report } from "@/lib/report";
import { SESSION_MESSAGES as M } from "@/features/auth/messages";
import card from "../authCard.module.css";
import styles from "./SessionExpiredPage.module.css";
import markIcon from "../assets/mark.svg";
import clockIcon from "../assets/clock.svg";

/** Keep only an in-app admin path, so a crafted ?next cannot redirect off-site (open redirect). */
function safeNext(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith("/admin/") || next.startsWith("/admin//")) return null;
  return next;
}

export function SessionExpiredPage() {
  const params = useSearchParams();
  const isAbsolute = params.get("reason") === "absolute";
  const next = safeNext(params.get("next"));
  const signInHref = next ? `/admin/sign-in?next=${encodeURIComponent(next)}` : "/admin/sign-in";

  useEffect(() => {
    void (async () => {
      try {
        await apiFetch("/admin/api/sign-out", { method: "POST" });
      } catch (error) {
        report("debug", "session-expired sign-out ping failed", {
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    })();
  }, []);

  return (
    <main className={card.page}>
      <div className={card.card}>
        <div className={`${card.brand} ${card.brandCentered}`}>
          <span className={card.brandMark}>
            <Icon src={markIcon} size={22} />
          </span>
          <span className={card.brandName}>TrackPoli Admin</span>
        </div>

        <div className={styles.iconRow}>
          <span className={styles.iconChip}>
            <Icon src={clockIcon} size={30} />
          </span>
        </div>

        <div className={styles.headingBlock}>
          <h1 className={styles.title}>{isAbsolute ? M.expiredAbsoluteTitle : M.expiredIdleTitle}</h1>
          <p className={styles.body}>{isAbsolute ? M.expiredAbsoluteBody : M.expiredIdleBody}</p>
        </div>

        <Button
          variant="filled"
          className={styles.fullButton}
          onClick={() => {
            window.location.assign(signInHref);
          }}
        >
          {M.signInAgain}
        </Button>

        <p className={card.footer}>{M.expiredFootnote}</p>
      </div>
    </main>
  );
}
