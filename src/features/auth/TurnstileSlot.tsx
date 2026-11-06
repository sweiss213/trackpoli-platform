"use client";

// Cloudflare Turnstile widget slot (Q-1-16). When NEXT_PUBLIC_TURNSTILE_SITE_KEY is set it loads the
// Turnstile script and renders the managed widget, handing the solved token up via onToken. When the key
// is not configured (e.g. local dev before the credential exists) it shows a neutral placeholder so the
// screen is complete and reports an empty token; the real bot check appears once the key is set.
//
// Turnstile tokens are single-use, so after a failed sign-in the widget must be reset to issue a fresh
// token — bump `resetKey` to do that. Placement is just above the Sign in button (the widget is not in the
// Figma design). onToken must be a stable reference (pass a state setter) so the widget is not re-rendered
// on every keystroke.

import { useEffect, useRef } from "react";
import styles from "./TurnstileSlot.module.css";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render(
    el: HTMLElement,
    opts: {
      sitekey: string;
      theme: "light" | "dark" | "auto";
      callback: (token: string) => void;
      "error-callback": () => void;
      "expired-callback": () => void;
    },
  ): string;
  reset(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function TurnstileSlot({ onToken, resetKey = 0 }: { onToken: (token: string) => void; resetKey?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!SITE_KEY) {
      onToken("");
      return;
    }

    function renderWidget() {
      if (widgetIdRef.current !== undefined || !containerRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY as string,
        theme: "light",
        callback: (token) => onToken(token),
        "error-callback": () => onToken(""),
        "expired-callback": () => onToken(""),
      });
    }

    if (window.turnstile) {
      renderWidget();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>("script[data-turnstile]");
    if (existing) {
      existing.addEventListener("load", renderWidget, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.dataset.turnstile = "true";
    script.addEventListener("load", renderWidget, { once: true });
    document.head.appendChild(script);
  }, [onToken]);

  // Reset the widget to issue a fresh token after a failed attempt (tokens are single-use).
  useEffect(() => {
    if (resetKey === 0 || !SITE_KEY) return;
    if (window.turnstile && widgetIdRef.current !== undefined) {
      window.turnstile.reset(widgetIdRef.current);
      onToken("");
    }
  }, [resetKey, onToken]);

  if (!SITE_KEY) {
    return (
      <div className={styles.placeholder} aria-hidden="true">
        Bot check appears here once configured
      </div>
    );
  }
  return <div ref={containerRef} className={styles.widget} />;
}
