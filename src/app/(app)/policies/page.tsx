import type { Metadata } from "next";
import { Placeholder } from "@/features/shell/Placeholder";

export const metadata: Metadata = { title: "Policies · TrackPoli Admin" };

// Guarded placeholder route (TP1-06); the Policies screen arrives in its own ticket.
export default function Page() {
  return <Placeholder title="Policies" />;
}
