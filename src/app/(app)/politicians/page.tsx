import type { Metadata } from "next";
import { Placeholder } from "@/features/shell/Placeholder";

export const metadata: Metadata = { title: "Politicians · TrackPoli Admin" };

// Guarded placeholder route (TP1-06); the Politicians screen arrives in its own ticket.
export default function Page() {
  return <Placeholder title="Politicians" />;
}
