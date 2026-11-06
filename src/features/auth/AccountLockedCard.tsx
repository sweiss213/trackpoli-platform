"use client";

// The "Account temporarily locked" view (ADR-0005 / Figma locked screen), shown when a sign-in attempt
// comes back with outcome "locked". It states the pause generically (no account detail), tells the user
// when they can try again (derived from lockedUntil), and offers a way back to the form. Pure presentation.

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { formatTimeUntil } from "@/lib/relativeTime";
import card from "./authCard.module.css";
import styles from "./AccountLockedCard.module.css";
import markIcon from "./assets/mark.svg";
import lockIcon from "./assets/lock.svg";
import clockIcon from "./assets/clock.svg";

export function AccountLockedCard({ lockedUntil, onBack }: { lockedUntil: string | null; onBack: () => void }) {
  return (
    <main className={card.page}>
      <section className={card.card} aria-labelledby="locked-title">
        <div className={`${card.brand} ${card.brandCentered}`}>
          <span className={card.brandMark}>
            <Icon src={markIcon} size={22} />
          </span>
          <span className={card.brandName}>TrackPoli Admin</span>
        </div>

        <div className={styles.chipRow}>
          <span className={styles.chip}>
            <Icon src={lockIcon} size={30} />
          </span>
        </div>

        <div className={styles.headingBlock}>
          <h1 id="locked-title" className={styles.title}>
            Account temporarily locked
          </h1>
          <p className={styles.subtext}>
            Too many failed sign-in attempts. For your security, access to this account has been paused.
          </p>
        </div>

        <div className={styles.infoRow}>
          <Icon src={clockIcon} size={22} />
          <p className={styles.infoText}>You can try signing in again {formatTimeUntil(lockedUntil)}.</p>
        </div>

        <Button variant="filled" onClick={onBack}>
          Back to sign in
        </Button>

        <p className={card.footer}>
          If you believe this is a mistake, contact a super administrator to unlock your account.
        </p>
      </section>
    </main>
  );
}
