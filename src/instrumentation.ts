// Server/edge error reporting (ADR-0005 reporting spine). Sentry is the reporting sink for the app; it is
// initialised ONLY when a DSN is configured, so local dev and the build without secrets are unaffected.
// The dynamic import keeps Sentry out of the bundle until a DSN is present. onRequestError forwards
// server-side request/render errors to Sentry automatically.

import type { Instrumentation } from "next";

function dsn(): string | undefined {
  return process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
}

export async function register(): Promise<void> {
  if (!dsn()) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn: dsn(),
    tracesSampleRate: 0,
    environment: process.env.ENVIRONMENT ?? process.env.NODE_ENV,
  });
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (!dsn()) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(err, request, context);
};
