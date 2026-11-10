import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { getSessionUser } from "@/features/auth/session";
import { SessionGuard } from "@/features/auth/session/SessionGuard";
import { sessionLimits } from "@/lib/config";
import "./globals.css";

// Roboto is the Material Design 3 default type (ADR-0006); next/font self-hosts it and exposes the
// --md-font-roboto variable the token layer consumes. 400 = body/regular, 500 = medium/labels.
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--md-font-roboto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TrackPoli Admin",
  description: "TrackPoli administration — invitation-only.",
};

// Phase 1 shell is intentionally minimal: the full app shell (navigation, header, snackbar/dialog hosts,
// loading/empty/error/not-found states, focus management) is built in P1-12. English (UK); interface text
// moves into next-intl in a later task. AuthProvider carries the server-resolved user (from the HttpOnly
// cookie session) to client components; getSessionUser is env-safe, so the build does not need secrets.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  return (
    <html lang="en-GB" className={roboto.variable}>
      <body>
        <AuthProvider user={user}>
          {children}
          {/* Safe sessions (TP1-05): idle/absolute warnings + cross-tab sync, only for a signed-in admin. */}
          <SessionGuard enabled={user !== null} limits={sessionLimits()} />
        </AuthProvider>
      </body>
    </html>
  );
}
