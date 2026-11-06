"use client";

// The shared /auth/confirm Continue page (Figma 1275:3830, 1276:3876, 1276:3914), reused by TP1-09. An
// email recovery/invite link lands here carrying a single-use token_hash. The token is exchanged ONLY when
// the person clicks Continue (a POST), never on page load — so an email security scanner that merely fetches
// the URL cannot consume the one-time link (ADR-0008, OWASP Forgot Password). On success the recovery
// session is set and we go to the reset screen; a used/expired/invalid link shows the expired state, and an
// unexpected failure shows the error state. Presentation + wiring only.

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { apiFetch } from "@/lib/apiFetch";
import card from "./authCard.module.css";
import styles from "./ConfirmPage.module.css";
import markIcon from "./assets/mark.svg";
import clockIcon from "./assets/clock-lg.svg";
import errorIcon from "./assets/error.svg";
import arrowBackIcon from "./assets/arrow-back.svg";

type ConfirmResponse = { outcome: "ok" } | { outcome: "expired" } | { outcome: "error" };

type Status = "idle" | "verifying" | "expired" | "error";

function Brand() {
  return (
    <div className={`${card.brand} ${card.brandCentered}`}>
      <span className={card.brandMark}>
        <Icon src={markIcon} size={22} />
      </span>
      <span className={card.brandName}>TrackPoli Admin</span>
    </div>
  );
}

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

// The expired and error states share one layout: an icon chip, heading, body, "Request a new link", back.
function ResultCard({ icon, title, body }: { icon: typeof clockIcon; title: string; body: string }) {
  return (
    <main className={card.page}>
      <section className={card.card} aria-labelledby="confirm-result-title">
        <Brand />
        <div className={styles.chipRow}>
          <span className={styles.chip}>
            <Icon src={icon} size={30} />
          </span>
        </div>
        <div className={styles.headingBlock}>
          <h1 id="confirm-result-title" className={styles.title}>
            {title}
          </h1>
          <p className={styles.body}>{body}</p>
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

export function ConfirmPage({ tokenHash, type }: { tokenHash: string | null; type: string | null }) {
  // No token means there is nothing to confirm — treat it as an invalid/expired link.
  const [status, setStatus] = useState<Status>(tokenHash ? "idle" : "expired");

  if (status === "expired") {
    return (
      <ResultCard
        icon={clockIcon}
        title="This link has expired"
        body="Password reset links can be used only once and expire after 24 hours. Request a new link to continue."
      />
    );
  }
  if (status === "error") {
    return (
      <ResultCard
        icon={errorIcon}
        title="Something went wrong"
        body="We couldn't open your reset link. Please request a new one and try again."
      />
    );
  }

  async function onContinue() {
    setStatus("verifying");
    try {
      const result = await apiFetch<ConfirmResponse>("/admin/api/auth/confirm", {
        method: "POST",
        body: { tokenHash, type: type ?? "recovery" },
      });
      if (result.outcome === "ok") {
        // Recovery session is set; go to the reset screen (full load so the new session cookie applies).
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full navigation so the recovery session is applied
        window.location.assign("/admin/reset-password");
        return;
      }
      setStatus(result.outcome === "expired" ? "expired" : "error");
    } catch {
      setStatus("error");
    }
  }

  const verifying = status === "verifying";
  return (
    <main className={card.page}>
      <section className={card.card} aria-labelledby="confirm-title">
        <Brand />
        <div className={styles.headingBlock}>
          <h1 id="confirm-title" className={styles.title}>
            Continue to reset password
          </h1>
          <p className={styles.body}>Select Continue to reset your TrackPoli Admin account password.</p>
        </div>
        <Button variant="filled" onClick={onContinue} disabled={verifying}>
          {verifying ? "Verifying…" : "Continue"}
        </Button>
        <div className={styles.cancelRow}>
          <a className={styles.cancel} href="/admin/sign-in">
            Cancel
          </a>
        </div>
        <p className={card.footer}>This link can be used only once and expires 24 hours after it was sent.</p>
      </section>
    </main>
  );
}
