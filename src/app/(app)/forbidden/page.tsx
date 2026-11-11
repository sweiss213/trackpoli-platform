import type { Metadata } from "next";
import { Suspense } from "react";
import { ForbiddenPage } from "@/features/shell/ForbiddenPage";

export const metadata: Metadata = { title: "Forbidden · TrackPoli Admin" };

// The 403 screen (TP1-06). Reached inside the shell when the middleware role gate redirects a session off a
// route its role may not open. The screen reads ?from (useSearchParams), so it sits inside Suspense.
export default function Page() {
  return (
    <Suspense>
      <ForbiddenPage />
    </Suspense>
  );
}
