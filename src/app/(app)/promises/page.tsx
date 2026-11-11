import type { Metadata } from "next";
import { Placeholder } from "@/features/shell/Placeholder";

export const metadata: Metadata = { title: "Promises · TrackPoli Admin" };

// Guarded placeholder route (TP1-06); the Promises screen arrives in its own ticket.
export default function Page() {
  return <Placeholder title="Promises" />;
}
