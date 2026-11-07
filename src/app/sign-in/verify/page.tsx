import type { Metadata } from "next";
import { requireUser } from "@/features/auth/session";
import { MfaVerifyPage } from "@/features/auth/MfaVerifyPage";

export const metadata: Metadata = {
  title: "Two-step verification · TrackPoli Admin",
};

// The sign-in step-up page (ADR-0009). Reached at aal1 with a verified factor; RequireMfa routes a session
// here. Requires a signed-in administrator (no session -> sign-in); the aal2 upgrade happens when the code
// is verified via /admin/api/mfa/verify.
export default async function Page() {
  await requireUser();
  return <MfaVerifyPage />;
}
