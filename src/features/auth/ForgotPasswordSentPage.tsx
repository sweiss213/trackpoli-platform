"use client";

// The "check your email" screen shown after a forgot-password request (Figma node 1274:3734, "Reset
// password link sent"). It is shown identically whether or not the submitted email has an account — the
// backend returns the same "sent" outcome for both — so it never reveals whether the address is registered
// (ADR-0008, OWASP Forgot Password). The copy is the enumeration-safe CONDITIONAL form ("If an account
// exists …"), matching the request acknowledgement, rather than a definitive "a link was sent to you".
// Pure presentation; the parent (ForgotPasswordPage) owns the submitted email.

import { Icon } from "@/components/ui/Icon";
import card from "./authCard.module.css";
import styles from "./ForgotPasswordSentPage.module.css";
import markIcon from "./assets/mark.svg";
import mailIcon from "./assets/mail.svg";
import arrowBackIcon from "./assets/arrow-back.svg";

export function ForgotPasswordSentPage({ email }: { email: string }) {
  return (
    <main className={card.page}>
      <section className={card.card} aria-labelledby="sent-title">
        <div className={`${card.brand} ${card.brandCentered}`}>
          <span className={card.brandMark}>
            <Icon src={markIcon} size={22} />
          </span>
          <span className={card.brandName}>TrackPoli Admin</span>
        </div>

        <div className={styles.chipRow}>
          <span className={styles.chip}>
            <Icon src={mailIcon} size={24} />
          </span>
        </div>

        <div className={styles.headingBlock}>
          <h1 id="sent-title" className={styles.title}>
            Check your email
          </h1>
          <p className={styles.body}>
            If an account exists for {email}, a password reset link is on its way.
            <br />
            Reset links expire after 24 hours and can be used only once.
          </p>
        </div>

        <div className={styles.backRow}>
          <a className={styles.back} href="/admin/sign-in">
            <Icon src={arrowBackIcon} size={20} />
            <span className={styles.backLabel}>Back to sign in</span>
          </a>
        </div>
      </section>
    </main>
  );
}
