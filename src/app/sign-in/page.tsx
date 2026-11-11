import type { Metadata } from "next";
import { SignInPage } from "@/features/auth/SignInPage";
import { PublicOnly } from "@/features/auth/guards/wrappers";

export const metadata: Metadata = {
  title: "Sign in · TrackPoli Admin",
};

// PublicOnly bounces an already-signed-in administrator into the app (TP1-06); an anonymous visitor sees the
// sign-in screen. /sign-in is a public path, so middleware lets an authenticated user reach it — this guard
// is what sends them on.
export default function Page() {
  return (
    <PublicOnly>
      <SignInPage />
    </PublicOnly>
  );
}

