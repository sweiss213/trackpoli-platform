import type { Metadata } from "next";
import { Placeholder } from "@/features/shell/Placeholder";

export const metadata: Metadata = { title: "Dashboard · TrackPoli Admin" };

// The dashboard landing (TP1-06 route; the rich dashboard content is its own ticket, Figma 943:86543).
export default function Page() {
  return <Placeholder title="Dashboard" note="The dashboard arrives in its own Phase 1 task." />;
}
