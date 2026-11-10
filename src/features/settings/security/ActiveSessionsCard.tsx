"use client";

// The Security-tab "Active sessions" card (TP1-05; Figma 1396:175539). Scope for this ticket is the bulk
// action — "Sign out everywhere else" — which revokes the administrator's OTHER sessions and leaves this one
// signed in (user story 2; OWASP Session Management's simultaneous-login policy). The per-device list
// (enumerate every session with device + location + last-active and sign each out individually) is a
// follow-up: it needs a Supabase session registry + user-agent parsing + IP geolocation that do not exist
// yet (tracked in docs/TODO.md). Presentation + wiring only; the revoke decision is server-side
// (/admin/api/session/sign-out-others).

import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { apiFetch } from "@/lib/apiFetch";
import { SESSION_MESSAGES as M } from "@/features/auth/messages";
import checkIcon from "@/features/auth/assets/check.svg";
import warningIcon from "@/features/auth/assets/warning.svg";
import { Icon } from "@/components/ui/Icon";
import styles from "./ActiveSessionsCard.module.css";

type State = "idle" | "busy" | "done" | "error";

export function ActiveSessionsCard() {
  const [state, setState] = useState<State>("idle");

  async function signOutOthers() {
    if (state === "busy") return;
    setState("busy");
    try {
      await apiFetch("/admin/api/session/sign-out-others", { method: "POST" });
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <section className={styles.card} aria-labelledby="active-sessions-title">
      <h2 id="active-sessions-title" className={styles.title}>
        {M.activeSessionsTitle}
      </h2>

      {state === "done" ? (
        <Banner icon={<Icon src={checkIcon} size={22} />}>{M.signedOutOthers}</Banner>
      ) : null}
      {state === "error" ? (
        <Banner icon={<Icon src={warningIcon} size={22} />}>{M.signOutOthersError}</Banner>
      ) : null}

      <div className={styles.row}>
        <div className={styles.text}>
          <span className={styles.rowTitle}>{M.thisDevice}</span>
          <span className={styles.rowBody}>active now</span>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.text}>
          <span className={styles.rowTitle}>{M.signOutEverywhereTitle}</span>
          <span className={styles.rowBody}>{M.signOutEverywhereBody}</span>
        </div>
        <button type="button" className={styles.action} onClick={signOutOthers} disabled={state === "busy"}>
          {state === "busy" ? M.signOutOthersBusy : M.signOutOthers}
        </button>
      </div>
    </section>
  );
}
