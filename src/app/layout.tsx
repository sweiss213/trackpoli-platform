import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrackPoli Admin",
  description: "TrackPoli administration — invitation-only.",
};

// Phase 1 shell is intentionally minimal: the real app shell (navigation, header, snackbar/dialog
// hosts, loading/empty/error/not-found states, focus management) is built in P1-12. English (UK);
// all interface text moves into next-intl in a later task.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
