import type { Metadata } from "next";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";

export const metadata: Metadata = {
  title: "Reset your password · TrackPoli Admin",
};

export default function Page() {
  return <ForgotPasswordPage />;
}
