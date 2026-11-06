import type { Metadata } from "next";
import { getSessionUser } from "@/features/auth/session";
import { ResetLinkInvalidCard, ResetPasswordPage } from "@/features/auth/ResetPasswordPage";

export const metadata: Metadata = {
  title: "Set a new password · TrackPoli Admin",
};

// The reset screen is reachable only on a valid recovery session (established by the /auth/confirm Continue
// page). With no session — a used, expired, or invalid link — show the invalid-link state instead of the
// form, so the token exchange, not this page, is what grants access (ADR-0008).
export default async function Page() {
  const user = await getSessionUser();
  if (!user || !user.email) {
    return <ResetLinkInvalidCard />;
  }
  return <ResetPasswordPage email={user.email} />;
}
