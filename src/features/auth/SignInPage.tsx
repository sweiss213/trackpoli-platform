"use client";

// The admin sign-in screen (Figma sign-in + error frames, ADR-0005/0006). It collects the email and
// password, runs the Turnstile check, and posts to /admin/api/sign-in, then renders the right state from
// the single typed outcome: a generic error banner + remaining-attempts helper on a failed attempt, the
// locked view on a pause, or a verification/rate-limit notice when blocked. It never reveals which
// credential was wrong or whether the email exists. Presentation + wiring only — all the decision logic
// lives server-side.

import { useCallback, useId, useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/apiFetch";
import { AccountLockedCard } from "./AccountLockedCard";
import { TurnstileSlot } from "./TurnstileSlot";
import { SIGN_IN_MESSAGES } from "./messages";
import card from "./authCard.module.css";
import styles from "./SignInPage.module.css";
import markIcon from "./assets/mark.svg";
import visibilityIcon from "./assets/visibility.svg";
import warningIcon from "./assets/warning.svg";
import googleIcon from "./assets/google.svg";

// Mirrors the server's SignInResult (kept local so this client file never imports the server module).
type SignInResponse =
  | { outcome: "success" }
  | { outcome: "failed"; attemptsRemaining: number | null }
  | { outcome: "locked"; lockedUntil: string | null }
  | { outcome: "blocked"; reason: "turnstile" | "rate_limited"; retryAfterSeconds?: number };

const NEEDS_TURNSTILE = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

export function SignInPage() {
  const emailId = useId();
  const passwordId = useId();
  const passwordHelperId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [locked, setLocked] = useState<{ lockedUntil: string | null } | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  const handleToken = useCallback((token: string) => setTurnstileToken(token), []);

  if (locked) {
    return (
      <AccountLockedCard
        lockedUntil={locked.lockedUntil}
        onBack={() => {
          setLocked(null);
          setNotice(null);
          setFieldError(false);
        }}
      />
    );
  }

  const canSubmit =
    !submitting && email.trim() !== "" && password !== "" && (!NEEDS_TURNSTILE || turnstileToken !== "");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setNotice(null);
    setFieldError(false);
    setAttemptsRemaining(null);
    try {
      const result = await apiFetch<SignInResponse>("/admin/api/sign-in", {
        method: "POST",
        body: { email: email.trim(), password, turnstileToken },
      });
      switch (result.outcome) {
        case "success":
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full-page load so the new session cookie is applied and the server re-renders authenticated
          window.location.assign("/admin");
          return;
        case "locked":
          setLocked({ lockedUntil: result.lockedUntil });
          return;
        case "blocked":
          setNotice(
            result.reason === "rate_limited"
              ? SIGN_IN_MESSAGES.rateLimited
              : SIGN_IN_MESSAGES.verificationNeeded,
          );
          break;
        default:
          setNotice(SIGN_IN_MESSAGES.genericError);
          setFieldError(true);
          setAttemptsRemaining(result.attemptsRemaining);
      }
    } catch {
      setNotice(SIGN_IN_MESSAGES.genericError);
      setFieldError(true);
    } finally {
      setSubmitting(false);
      // Turnstile tokens are single-use: clear the token and reset the widget so a retry gets a fresh one.
      setTurnstileToken("");
      setTurnstileResetKey((key) => key + 1);
    }
  }

  const passwordHelper =
    attemptsRemaining !== null ? SIGN_IN_MESSAGES.attemptsRemaining(attemptsRemaining) : undefined;

  return (
    <main className={card.page}>
      <form className={card.card} onSubmit={onSubmit} noValidate aria-labelledby="signin-title">
        <div className={card.brand}>
          <span className={card.brandMark}>
            <Icon src={markIcon} size={22} />
          </span>
          <span className={card.brandName}>TrackPoli Admin</span>
        </div>

        <div className={styles.headingBlock}>
          <h1 id="signin-title" className={styles.title}>
            Sign in
          </h1>
          <p className={styles.subtext}>
            Use your TrackPoli administrator credentials to access the console.
          </p>
        </div>

        {notice ? (
          <Alert>
            <Icon src={warningIcon} size={22} />
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        ) : null}

        <div className={styles.fields}>
          <div className="flex w-full flex-col gap-1.5">
            <Label htmlFor={emailId}>Email</Label>
            <Input
              id={emailId}
              type="email"
              name="email"
              autoComplete="username"
              inputMode="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="flex w-full flex-col gap-1.5">
            <Label htmlFor={passwordId}>Password</Label>
            <div className="relative">
              <Input
                id={passwordId}
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={fieldError || undefined}
                aria-describedby={passwordHelper ? passwordHelperId : undefined}
                className="pr-14"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1/2 right-1 -translate-y-1/2"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                <Icon src={visibilityIcon} size={22} />
              </Button>
            </div>
            {passwordHelper ? (
              <p
                id={passwordHelperId}
                className="m-0 text-[length:var(--md-body-small-size)] leading-[var(--md-body-small-line)] tracking-[var(--md-body-small-tracking)] text-muted-foreground"
              >
                {passwordHelper}
              </p>
            ) : null}
          </div>
        </div>

        <div className={styles.forgotRow}>
          <a className={styles.forgot} href="/admin/forgot-password">
            Forgot password?
          </a>
        </div>

        <div className={styles.divider}>
          <span className={styles.rule} />
          <span className={styles.or}>or</span>
          <span className={styles.rule} />
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- navigates to a redirect route handler (not a Next page); must be a full browser navigation
            window.location.assign("/admin/auth/google");
          }}
        >
          <Icon src={googleIcon} size={20} />
          Continue with Google
        </Button>

        <TurnstileSlot onToken={handleToken} resetKey={turnstileResetKey} />

        <Button variant="secondary" className="w-full" type="submit" disabled={!canSubmit}>
          Sign in
        </Button>

        <p className={card.footer}>
          Access is restricted to approved administrators. All sign-in attempts are logged for audit.
        </p>
      </form>
    </main>
  );
}
