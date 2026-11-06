"use client";

// The admin set-new-password screen (Figma node 1210:2456, "Set a new password"). It is reached only on a
// valid recovery session (established by the /auth/confirm Continue page); the server page passes the
// session email in. It collects the new password twice, enforces the shared policy, and posts to
// /admin/api/reset-password, which updates the password, clears the lockout, writes the completion event and
// ends all sessions (ADR-0008) — so on success the user is sent to the normal sign-in (no auto-login).
//
// Password policy is LENGTH-ONLY (NFR-S2: "minimum 12 characters, no weakening composition rules"), aligned
// with NIST SP 800-63B and OWASP; the design's composition hints are intentionally reduced to the length
// rule. Presentation + wiring only.

import { useState, type FormEvent } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { TextField } from "@/components/ui/TextField";
import { apiFetch } from "@/lib/apiFetch";
import { PASSWORD_RESET_MESSAGES } from "./messages";
import card from "./authCard.module.css";
import styles from "./ResetPasswordPage.module.css";
import markIcon from "./assets/mark.svg";
import warningIcon from "./assets/warning.svg";
import visibilityIcon from "./assets/visibility.svg";
import checkIcon from "./assets/check.svg";
import dotIcon from "./assets/requirement-dot.svg";
import arrowBackIcon from "./assets/arrow-back.svg";

const MIN_LENGTH = 12; // NFR-S2 / Supabase minimum_password_length

type ResetResponse = { outcome: "done" } | { outcome: "no_session" } | { outcome: "weak_password" };

function BackToSignIn() {
  return (
    <div className={styles.backRow}>
      <a className={styles.back} href="/admin/sign-in">
        <Icon src={arrowBackIcon} size={20} />
        <span className={styles.backLabel}>Back to sign in</span>
      </a>
    </div>
  );
}

/** Shown when the reset page is opened without a valid recovery session (link used, expired, or invalid).
 *  A stand-in until the Continue-page link-expired design lands; built to the same design system. */
export function ResetLinkInvalidCard() {
  return (
    <main className={card.page}>
      <section className={card.card} aria-labelledby="reset-invalid-title">
        <div className={card.brand}>
          <span className={card.brandMark}>
            <Icon src={markIcon} size={22} />
          </span>
          <span className={card.brandName}>TrackPoli Admin</span>
        </div>
        <div className={styles.headingBlock}>
          <h1 id="reset-invalid-title" className={styles.title}>
            This link has expired
          </h1>
          <p className={styles.subtext}>{PASSWORD_RESET_MESSAGES.linkExpired}</p>
        </div>
        <Button
          variant="filled"
          onClick={() => {
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full navigation to the request screen
            window.location.assign("/admin/forgot-password");
          }}
        >
          Request a new link
        </Button>
        <BackToSignIn />
      </section>
    </main>
  );
}

export function ResetPasswordPage({ email }: { email: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const meetsLength = password.length >= MIN_LENGTH;
  const matches = confirm !== "" && password === confirm;
  const mismatch = confirm !== "" && password !== confirm;
  const canSubmit = !submitting && meetsLength && matches;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setNotice(null);
    try {
      const result = await apiFetch<ResetResponse>("/admin/api/reset-password", {
        method: "POST",
        body: { password },
      });
      switch (result.outcome) {
        case "done":
          // No auto-login (ADR-0008): full navigation to the normal sign-in; all sessions were ended.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full load so the cleared session is applied
          window.location.assign("/admin/sign-in?reset=1");
          return;
        case "no_session":
          setNotice(PASSWORD_RESET_MESSAGES.linkExpired);
          break;
        default:
          setNotice(PASSWORD_RESET_MESSAGES.weakPassword);
      }
    } catch {
      // A transport/infra failure is not necessarily a weak password — show a generic message, not the
      // "choose a 12-character password" copy, which would misdescribe the problem.
      setNotice(PASSWORD_RESET_MESSAGES.genericError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={card.page}>
      <form className={card.card} onSubmit={onSubmit} noValidate aria-labelledby="reset-title">
        <div className={card.brand}>
          <span className={card.brandMark}>
            <Icon src={markIcon} size={22} />
          </span>
          <span className={card.brandName}>TrackPoli Admin</span>
        </div>

        <div className={styles.headingBlock}>
          <h1 id="reset-title" className={styles.title}>
            Set a new password
          </h1>
          <p className={styles.subtext}>Create a new password for {email}.</p>
        </div>

        {notice ? <Banner icon={<Icon src={warningIcon} size={22} />}>{notice}</Banner> : null}

        <div className={styles.fields}>
          <TextField
            label="New password"
            type={showPassword ? "text" : "password"}
            name="new-password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            trailing={
              <button
                type="button"
                className={styles.toggle}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                <Icon src={visibilityIcon} size={22} />
              </button>
            }
          />
          <TextField
            label="Confirm new password"
            type={showConfirm ? "text" : "password"}
            name="confirm-password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            error={mismatch}
            helperText={mismatch ? "Both passwords must match." : undefined}
            trailing={
              <button
                type="button"
                className={styles.toggle}
                aria-label={showConfirm ? "Hide password" : "Show password"}
                aria-pressed={showConfirm}
                onClick={() => setShowConfirm((value) => !value)}
              >
                <Icon src={visibilityIcon} size={22} />
              </button>
            }
          />
        </div>

        <div className={styles.requirements}>
          <p className={styles.reqTitle}>Password must include:</p>
          <p className={styles.reqItem}>
            <Icon src={meetsLength ? checkIcon : dotIcon} size={18} />
            <span className={meetsLength ? styles.reqMet : styles.reqText}>At least 12 characters</span>
          </p>
        </div>

        <Button variant="filled" type="submit" disabled={!canSubmit}>
          Reset password
        </Button>

        <BackToSignIn />
      </form>
    </main>
  );
}
