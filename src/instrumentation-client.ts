// Browser error reporting (ADR-0005). Sentry is initialised in the browser only when a public DSN is set;
// the dynamic import keeps it out of the main bundle otherwise. Unhandled client errors are then captured
// automatically.

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  void import("@sentry/nextjs")
    .then((Sentry) => {
      Sentry.init({ dsn, tracesSampleRate: 0 });
    })
    .catch(() => undefined);
}
