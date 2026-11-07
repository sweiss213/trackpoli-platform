"use client";

// The Security-tab Two-factor card and device-replacement modal (TP1-04 deliverable, ADR-0009; Figma
// 1296:85823 / 1296:89239). The card shows status and opens a 3-step replacement wizard: confirm it's you
// (re-authenticate — password or Google by account type — plus a code from the CURRENT device) -> add the
// new device (QR / key) -> enter the new device's code, which verifies the new factor and drops the old one
// so exactly one remains. A lost current device is never self-service: the "I don't have my current device"
// path explains the manager-recreate recovery (role-aware). The session alone is never trusted (OWASP MFA).
// Presentation + wiring only; the MFA decisions are server-side (/admin/api/mfa/replace).

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { TextField } from "@/components/ui/TextField";
import { apiFetch } from "@/lib/apiFetch";
import { report } from "@/lib/report";
import { MFA_REPLACE_MESSAGES as M } from "@/features/auth/messages";
import styles from "./TwoFactorCard.module.css";
import warningIcon from "@/features/auth/assets/warning.svg";
import googleIcon from "@/features/auth/assets/google.svg";
import checkIcon from "@/features/auth/assets/check.svg";
import copyIcon from "@/features/auth/assets/copy.svg";
import lockIcon from "@/features/auth/assets/lock.svg";
import errorIcon from "@/features/auth/assets/error.svg";

type EnrolStart = { factorId: string; qrCode: string; secret: string; uri: string };
type AuthorizeResponse =
  | { outcome: "authorized"; enrol: EnrolStart }
  | { outcome: "reauth_failed" }
  | { outcome: "invalid_current_code" }
  | { outcome: "too_many_attempts" }
  | { outcome: "no_factor" };
type CompleteResponse =
  | { outcome: "replaced" }
  | { outcome: "invalid_new_code" }
  | { outcome: "too_many_attempts" };

type Step = "intro" | "reauth" | "newDevice" | "newCode" | "lost" | "paused" | "failed" | "success";

const SIX = /^\d{6}$/;

function qrSrc(qr: string): string {
  return qr.startsWith("<svg") ? `data:image/svg+xml;utf8,${encodeURIComponent(qr)}` : qr;
}
function groupKey(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

export function TwoFactorCard({
  enrolled,
  accountType,
  isManager,
}: {
  enrolled: boolean;
  accountType: "password" | "google";
  isManager: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();

  // Resume the modal after the Google re-auth round-trip returns (?reauth=ok|mismatch|error) by deriving the
  // initial state from the URL, rather than opening it from an effect.
  const reauthParam = params.get("reauth");
  const [step, setStep] = useState<Step | null>(reauthParam ? "reauth" : null);
  const [password, setPassword] = useState("");
  const [currentCode, setCurrentCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [enrol, setEnrol] = useState<EnrolStart | null>(null);
  const [googleReauthed, setGoogleReauthed] = useState(reauthParam === "ok");
  const [showKey, setShowKey] = useState(false);
  const [notice, setNotice] = useState<string | null>(
    reauthParam === "mismatch" ? M.googleMismatch : reauthParam === "error" ? M.googleNotCompleted : null,
  );
  const [codeError, setCodeError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  function reset() {
    setPassword("");
    setCurrentCode("");
    setNewCode("");
    setEnrol(null);
    setGoogleReauthed(false);
    setShowKey(false);
    setNotice(null);
    setCodeError(false);
    setCopied(false);
  }
  function open() {
    reset();
    setStep("intro");
  }
  function close() {
    setStep(null);
    reset();
    router.refresh();
  }

  function applyAuthorize(result: AuthorizeResponse) {
    switch (result.outcome) {
      case "authorized":
        setEnrol(result.enrol);
        setNotice(null);
        setCodeError(false);
        setShowKey(false);
        setStep("newDevice");
        return;
      case "invalid_current_code":
        setNotice(M.wrongCurrentCode);
        setCodeError(true);
        return;
      case "too_many_attempts":
        setStep("paused");
        return;
      case "no_factor":
        setStep("failed");
        return;
      default:
        setNotice(M.reauthFailed);
    }
  }

  async function authorize() {
    if (!SIX.test(currentCode) || busy) return;
    if (accountType === "password" && password === "") return;
    if (accountType === "google" && !googleReauthed) return;
    setBusy(true);
    setNotice(null);
    setCodeError(false);
    try {
      const body =
        accountType === "password"
          ? { step: "authorize", method: "password", password, currentCode }
          : { step: "authorize", method: "google", currentCode };
      applyAuthorize(await apiFetch<AuthorizeResponse>("/admin/api/mfa/replace", { method: "POST", body }));
    } catch {
      setStep("failed");
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    if (!enrol || !SIX.test(newCode) || busy) return;
    setBusy(true);
    setNotice(null);
    setCodeError(false);
    try {
      const result = await apiFetch<CompleteResponse>("/admin/api/mfa/replace", {
        method: "POST",
        body: { step: "complete", newFactorId: enrol.factorId, newCode },
      });
      if (result.outcome === "replaced") setStep("success");
      else if (result.outcome === "too_many_attempts") setStep("paused");
      else {
        setNotice(M.wrongNewCode);
        setCodeError(true);
      }
    } catch {
      setStep("failed");
    } finally {
      setBusy(false);
    }
  }

  async function copyKey() {
    if (!enrol) return;
    try {
      await navigator.clipboard.writeText(enrol.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      report("debug", "clipboard copy unavailable", {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const canAuthorize =
    SIX.test(currentCode) && (accountType === "password" ? password !== "" : googleReauthed);

  return (
    <section className={styles.card} aria-labelledby="twofactor-title">
      <h2 id="twofactor-title" className={styles.title}>
        {M.cardTitle}
      </h2>
      <p className={styles.status} data-enrolled={enrolled}>
        {M.cardStatus}
      </p>
      <p className={styles.note}>{M.cardNote}</p>
      <button type="button" className={styles.action} onClick={open}>
        {M.replaceButton}
      </button>

      {step ? renderDialog() : null}
    </section>
  );

  function renderDialog() {
    return (
      <div className={styles.overlay} role="presentation" onClick={close}>
        <div
          className={styles.dialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby="replace-title"
          onClick={(event) => event.stopPropagation()}
        >
          {renderDialogBody()}
        </div>
      </div>
    );
  }

  function renderStepHeader(n: 1 | 2 | 3, title: string) {
    return (
      <>
        <p className={styles.stepLabel}>Step {n} of 3</p>
        <h3 id="replace-title" className={styles.dialogTitle}>
          {title}
        </h3>
      </>
    );
  }

  function renderDialogBody() {
    if (step === "intro") {
      return (
        <>
          <h3 id="replace-title" className={styles.dialogTitle}>
            {M.introTitle}
          </h3>
          <p className={styles.dialogText}>{M.introBody}</p>
          <ol className={styles.introSteps}>
            {[M.introStep1, M.introStep2, M.introStep3].map((text, i) => (
              <li key={i} className={styles.introRow}>
                <span className={styles.introNum}>{i + 1}</span>
                <span className={styles.introText}>{text}</span>
              </li>
            ))}
          </ol>
          <div className={styles.infoBox}>
            <span className={styles.infoTitle}>{M.introReassureTitle}</span>
            <span className={styles.infoBody}>{M.introReassure}</span>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.textButton} onClick={close}>
              {M.cancel}
            </button>
            <Button variant="filled" onClick={() => setStep("reauth")}>
              {M.getStarted}
            </Button>
          </div>
        </>
      );
    }

    if (step === "reauth") {
      return (
        <>
          {renderStepHeader(1, M.step1Title)}
          <p className={styles.dialogText}>
            {accountType === "password" ? M.step1PasswordIntro : M.step1GoogleIntro}
          </p>
          {notice ? <Banner icon={<Icon src={warningIcon} size={22} />}>{notice}</Banner> : null}
          {accountType === "password" ? (
            <TextField
              label={M.passwordLabel}
              type="password"
              name="current-password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          ) : (
            <div className={styles.googleRow}>
              <span className={styles.fieldLabel}>{M.googleAccountLabel}</span>
              <button
                type="button"
                className={styles.googleButton}
                data-done={googleReauthed}
                disabled={googleReauthed}
                onClick={() => {
                  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full navigation to the OAuth round-trip route
                  window.location.assign("/admin/auth/reauth/google");
                }}
              >
                <Icon src={googleReauthed ? checkIcon : googleIcon} size={20} />
                <span>{googleReauthed ? M.reauthedGoogle : M.reauthGoogle}</span>
              </button>
            </div>
          )}
          <TextField
            label={M.currentCodeLabel}
            name="current-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            value={currentCode}
            error={codeError}
            onChange={(e) => setCurrentCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          <button type="button" className={styles.textLink} onClick={() => setStep("lost")}>
            {M.lostLink}
          </button>
          <div className={styles.actions}>
            <button type="button" className={styles.textButton} onClick={close}>
              {M.cancel}
            </button>
            <Button variant="filled" onClick={authorize} disabled={!canAuthorize || busy}>
              {M.continueButton}
            </Button>
          </div>
        </>
      );
    }

    if (step === "newDevice" && enrol) {
      return (
        <>
          {renderStepHeader(2, M.step2Title)}
          <p className={styles.dialogText}>{M.step2Body}</p>
          {showKey ? (
            <div className={styles.keyBox}>
              <span className={styles.key}>{groupKey(enrol.secret)}</span>
              <button type="button" className={styles.keyAction} onClick={copyKey}>
                <Icon src={copyIcon} size={18} />
                <span>{copied ? "Copied" : "Copy key"}</span>
              </button>
            </div>
          ) : (
            <div className={styles.qrRow}>
              <span className={styles.qrFrame}>
                {/* eslint-disable-next-line @next/next/no-img-element -- dynamic QR from the server; next/image cannot optimize it */}
                <img src={qrSrc(enrol.qrCode)} alt="QR code for your new authenticator device" width={150} height={150} />
              </span>
            </div>
          )}
          <button type="button" className={styles.textLink} onClick={() => setShowKey((v) => !v)}>
            {showKey ? "Scan the QR code instead" : "Can't scan? Enter the key manually"}
          </button>
          <div className={styles.actions}>
            <button type="button" className={styles.textButton} onClick={close}>
              {M.cancel}
            </button>
            <Button variant="filled" onClick={() => setStep("newCode")}>
              {M.continueButton}
            </Button>
          </div>
        </>
      );
    }

    if (step === "newCode" && enrol) {
      return (
        <>
          {renderStepHeader(3, M.step3Title)}
          <p className={styles.dialogText}>{M.step3Body}</p>
          {notice ? <Banner icon={<Icon src={warningIcon} size={22} />}>{notice}</Banner> : null}
          <TextField
            label="6-digit code"
            name="new-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            value={newCode}
            error={codeError}
            onChange={(e) => setNewCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          <div className={styles.actions}>
            <button type="button" className={styles.textButton} onClick={() => setStep("newDevice")}>
              {M.back}
            </button>
            <Button variant="filled" onClick={complete} disabled={!SIX.test(newCode) || busy}>
              {M.replaceConfirm}
            </Button>
          </div>
        </>
      );
    }

    if (step === "lost") {
      return (
        <>
          <h3 id="replace-title" className={styles.dialogTitle}>
            {M.lostTitle}
          </h3>
          <p className={styles.dialogText}>{isManager ? M.lostBodyManager : M.lostBodyAdmin}</p>
          <div className={styles.infoBox}>
            <span className={styles.infoTitle}>
              {isManager ? M.lostNextManagerTitle : M.lostNextAdminTitle}
            </span>
            <span className={styles.infoBody}>{isManager ? M.lostNextManager : M.lostNextAdmin}</span>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.textButton} onClick={close}>
              {M.close}
            </button>
            <Button variant="filled" onClick={() => setStep("reauth")}>
              {M.back}
            </Button>
          </div>
        </>
      );
    }

    if (step === "paused") {
      return renderOutcome(lockIcon, M.pausedTitle, M.pausedBody);
    }
    if (step === "success") {
      return renderOutcome(checkIcon, M.successTitle, M.successBody);
    }
    // failed
    return renderOutcome(errorIcon, M.failedTitle, M.failedBody);
  }

  function renderOutcome(icon: typeof checkIcon, title: string, body: string) {
    return (
      <div className={styles.outcome}>
        <span className={styles.iconChip}>
          <Icon src={icon} size={30} />
        </span>
        <h3 id="replace-title" className={styles.dialogTitle}>
          {title}
        </h3>
        <p className={styles.dialogText}>{body}</p>
        <Button variant="filled" onClick={close}>
          {M.close}
        </Button>
      </div>
    );
  }
}
