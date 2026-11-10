import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/features/auth/session";
import { getTwoFactorStatus } from "@/features/settings/security/twoFactor";
import { TwoFactorCard } from "@/features/settings/security/TwoFactorCard";
import { ActiveSessionsCard } from "@/features/settings/security/ActiveSessionsCard";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Security · TrackPoli Admin",
};

// The Security settings page. Reaching it already requires aal2 (RequireMfa routes a sub-aal2 session to
// enrol/verify, and RLS denies aal1 data regardless), so it is a plain protected page: ensure a signed-in
// administrator, read the two-factor status through the feature function, and render the card (ADR-0009).
// The card reads the ?reauth return param (useSearchParams), so it sits inside a Suspense boundary.
export default async function Page() {
  await requireUser();
  const status = await getTwoFactorStatus();
  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Security</h1>
      <Suspense>
        <TwoFactorCard
          enrolled={status.enrolled}
          accountType={status.accountType}
          isManager={status.isManager}
        />
      </Suspense>
      <ActiveSessionsCard />
    </main>
  );
}
