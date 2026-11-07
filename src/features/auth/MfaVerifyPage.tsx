"use client";

// The sign-in step-up screen (Figma node 1211:2431, "Two-step verification"). Reached when a session is
// aal1 with a verified factor (RequireMfa routes it here, ADR-0009). It collects the 6-digit authenticator
// code and posts to /admin/api/mfa/verify, which challenges and verifies the factor and lifts the session
// to aal2; on success it reloads into the app so the upgraded session cookie is applied. A wrong code never
// reveals whether it was incorrect or expired. Presentation + wiring only — the decision logic is server-side.
//
// Accessibility: the design draws a bare code box; we keep the house TextField with a visible label and an
// autocomplete="one-time-code" / inputmode="numeric" input so it stays WCAG-AA and works with password
// managers (universal-accessibility-wcag).

import { useState, type FormEvent } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { TextField } from "@/components/ui/TextField";
import { apiFetch } from "@/lib/apiFetch";
import { MFA_MESSAGES } from "./messages";
import card from "./authCard.module.css";
import styles from "./MfaVerifyPage.module.css";
import markIcon from "./assets/mark.svg";
import warningIcon from "./assets/warning.svg";

// Mirrors the server's VerifyResult (kept local so this client file never imports the server module).
type VerifyResponse =
  | { outcome: "verified" }
  | { outcome: "invalid_code" }
  | { outcome: "too_many_attempts" }
  | { outcome: "no_factor" };

const CODE_PATTERN = /^\d{6}$/;

export function MfaVerifyPage() {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState(false);

  const canSubmit = !submitting && CODE_PATTERN.test(code);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setNotice(null);
    setFieldError(false);
    try {
      const result = await apiFetch<VerifyResponse>("/admin/api/mfa/verify", {
        method: "POST",
        body: { code },
      });
      switch (result.outcome) {
        case "verified":
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full-page load so the upgraded aal2 session cookie is applied and the server re-renders
          window.location.assign("/admin");
          return;
        case "no_factor":
          // A routing anomaly (the gate should not send a factorless session here) — send them back to sign in.
          setNotice(MFA_MESSAGES.noFactor);
          break;
        case "too_many_attempts":
          setNotice(MFA_MESSAGES.tooManyAttempts);
          setFieldError(true);
          break;
        default:
          setNotice(MFA_MESSAGES.invalidCode);
          setFieldError(true);
      }
    } catch {
      setNotice(MFA_MESSAGES.genericError);
      setFieldError(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={card.page}>
      <form className={card.card} onSubmit={onSubmit} noValidate aria-labelledby="verify-title">
        <div className={card.brand}>
          <span className={card.brandMark}>
            <Icon src={markIcon} size={22} />
          </span>
          <span className={card.brandName}>TrackPoli Admin</span>
        </div>

        <div className={styles.headingBlock}>
          <h1 id="verify-title" className={styles.title}>
            Two-step verification
          </h1>
          <p className={styles.subtext}>{MFA_MESSAGES.verifyIntro}</p>
        </div>

        {notice ? <Banner icon={<Icon src={warningIcon} size={22} />}>{notice}</Banner> : null}

        <div className={styles.fields}>
          <TextField
            label="Verification code"
            name="one-time-code"
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            error={fieldError}
          />
        </div>

        <Button variant="filled" type="submit" disabled={!canSubmit}>
          Verify
        </Button>

        <p className={card.footer}>{MFA_MESSAGES.verifyRecoveryHelp}</p>
      </form>
    </main>
  );
}
