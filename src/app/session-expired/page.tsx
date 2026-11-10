import type { Metadata } from "next";
import { Suspense } from "react";
import { SessionExpiredPage } from "@/features/auth/session/SessionExpiredPage";

export const metadata: Metadata = {
  title: "Session expired · TrackPoli Admin",
};

// The session-expired landing (TP1-05). Public: the browser arrives here after a timeout once the session
// cookies are cleared, so it must render with no session (MFA_PUBLIC_PATHS). The screen reads ?reason and
// ?next (useSearchParams), so it sits inside a Suspense boundary.
export default function Page() {
  return (
    <Suspense>
      <SessionExpiredPage />
    </Suspense>
  );
}
