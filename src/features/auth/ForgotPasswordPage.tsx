"use client";

// The admin forgot-password request screen (Figma node 1210:2431, "Reset your password"). It collects the
// email, runs the Turnstile check (the design omits the widget; the ticket requires CAPTCHA, so it sits
// below the email field as on the sign-in screen), and posts to /admin/api/request-password-reset. The
// response is the same "sent" outcome whether or not the email has an account, so on success the screen
// shows one generic acknowledgement and never reveals whether the address is registered (ADR-0008).
// Presentation + wiring only; all decision logic is server-side.
//
// NOTE: the dedicated "check your email" screen (ForgotPasswordSentPage) is pending its Figma design; until
// then the acknowledgement is shown inline here, built to the same design system.

import { useCallback, useState, type FormEvent } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { TextField } from "@/components/ui/TextField";
import { apiFetch } from "@/lib/apiFetch";
import { ForgotPasswordSentPage } from "./ForgotPasswordSentPage";
import { TurnstileSlot } from "./TurnstileSlot";
import { PASSWORD_RESET_MESSAGES } from "./messages";
import card from "./authCard.module.css";
import styles from "./ForgotPasswordPage.module.css";
import markIcon from "./assets/mark.svg";
import warningIcon from "./assets/warning.svg";
import arrowBackIcon from "./assets/arrow-back.svg";

// Mirrors the server's RequestResetResult (kept local so this client file never imports the server module).
type RequestResetResponse =
  | { outcome: "sent" }
  | { outcome: "blocked"; reason: "turnstile" | "rate_limited"; retryAfterSeconds?: number };

const NEEDS_TURNSTILE = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

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

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  const handleToken = useCallback((token: string) => setTurnstileToken(token), []);

  if (sent) {
    // Enumeration-safe "check your email" screen, shown identically whether or not the email has an
    // account (ADR-0008). The submitted email is echoed back (the user typed it; not a leak).
    return <ForgotPasswordSentPage email={email.trim()} />;
  }

  const canSubmit = !submitting && email.trim() !== "" && (!NEEDS_TURNSTILE || turnstileToken !== "");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setNotice(null);
    try {
      const result = await apiFetch<RequestResetResponse>("/admin/api/request-password-reset", {
        method: "POST",
        body: { email: email.trim(), turnstileToken },
      });
      if (result.outcome === "blocked") {
        setNotice(
          result.reason === "rate_limited"
            ? PASSWORD_RESET_MESSAGES.rateLimited
            : PASSWORD_RESET_MESSAGES.verificationNeeded,
        );
      } else {
        setSent(true);
      }
    } catch {
      // A transport/infra failure is not account-correlated; show the generic verification notice.
      setNotice(PASSWORD_RESET_MESSAGES.verificationNeeded);
    } finally {
      setSubmitting(false);
      // Turnstile tokens are single-use: clear the token and reset the widget so a retry gets a fresh one.
      setTurnstileToken("");
      setTurnstileResetKey((key) => key + 1);
    }
  }

  return (
    <main className={card.page}>
      <form className={card.card} onSubmit={onSubmit} noValidate aria-labelledby="forgot-title">
        <div className={card.brand}>
          <span className={card.brandMark}>
            <Icon src={markIcon} size={22} />
          </span>
          <span className={card.brandName}>TrackPoli Admin</span>
        </div>

        <div className={styles.headingBlock}>
          <h1 id="forgot-title" className={styles.title}>
            Reset your password
          </h1>
          <p className={styles.subtext}>
            Enter the email linked to your admin account and we&rsquo;ll send a secure reset link.
          </p>
        </div>

        {notice ? <Banner icon={<Icon src={warningIcon} size={22} />}>{notice}</Banner> : null}

        <div className={styles.fields}>
          <TextField
            label="Email"
            type="email"
            name="email"
            autoComplete="username"
            inputMode="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <TurnstileSlot onToken={handleToken} resetKey={turnstileResetKey} />

        <Button variant="filled" type="submit" disabled={!canSubmit}>
          Send reset link
        </Button>

        <BackToSignIn />

        <p className={card.footer}>Reset links expire after 24 hours and can be used only once.</p>
      </form>
    </main>
  );
}
