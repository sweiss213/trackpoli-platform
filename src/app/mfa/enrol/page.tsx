import type { Metadata } from "next";
import { requireUser } from "@/features/auth/session";
import { MfaEnrolPage } from "@/features/auth/MfaEnrolPage";

export const metadata: Metadata = {
  title: "Set up two-step verification · TrackPoli Admin",
};

// The forced first-time enrolment gate (ADR-0009). RequireMfa routes any signed-in administrator without a
// verified factor here; the RLS aal2 gate means no data is reachable until enrolment completes. Requires a
// signed-in administrator (no session -> sign-in); the aal2 upgrade happens when "Verify and turn on"
// confirms the code via /admin/api/mfa/enrol.
export default async function Page() {
  const user = await requireUser();
  return <MfaEnrolPage email={user.email ?? ""} />;
}
