"use client";

// The 404 not-found screen (TP1-06; Figma 1221:2611). Shown inside the app shell when a route or record does
// not exist; the code chip shows the attempted path (the current URL). Presentation only.

import { usePathname } from "next/navigation";
import { ErrorState } from "./ErrorState";
import notFoundIcon from "./assets/not-found.svg";

export function NotFoundPage() {
  const pathname = usePathname() ?? "";

  return (
    <ErrorState
      icon={notFoundIcon}
      title="We couldn't find that page"
      body="The page or record you're looking for doesn't exist. It may have been moved, or deleted and sent to Recently deleted."
      code={`Error 404 · Not found · ${pathname}`}
      primary={{ label: "Back to dashboard", href: "/admin" }}
      secondary={{ label: "Go to Recently deleted", href: "/admin/recently-deleted" }}
    />
  );
}
