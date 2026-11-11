import { NotFoundPage } from "@/features/shell/NotFoundPage";

// The 404 screen for the authenticated app (TP1-06). Next renders this inside the (app) shell when a route
// under it does not match; the attempted path is the current URL.
export default function NotFound() {
  return <NotFoundPage />;
}
