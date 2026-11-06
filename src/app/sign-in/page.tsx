import type { Metadata } from "next";
import { SignInPage } from "@/features/auth/SignInPage";

export const metadata: Metadata = {
  title: "Sign in · TrackPoli Admin",
};

export default function Page() {
  return <SignInPage />;
}
