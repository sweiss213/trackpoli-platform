import { Suspense } from "react";
import type { Metadata } from "next";
import { ConfirmPage } from "@/features/auth/ConfirmPage";

export const metadata: Metadata = {
  title: "Continue · TrackPoli Admin",
  // Keep the single-use token_hash in the URL from leaking to any third party via the Referer header
  // (OWASP Forgot Password: Referrer-Policy: no-referrer on the reset path).
  referrer: "no-referrer",
};

// Reads the link's token_hash + type from the URL and hands them to the client page, which exchanges the
// token only on the Continue click (never on load), so email scanners cannot consume the one-time link.
// The searchParams read is dynamic, so it sits behind a Suspense boundary (Next cacheComponents).
export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  return (
    <Suspense>
      <ConfirmLoader searchParams={searchParams} />
    </Suspense>
  );
}

async function ConfirmLoader({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  const sp = await searchParams;
  return <ConfirmPage tokenHash={sp.token_hash ?? null} type={sp.type ?? null} />;
}
