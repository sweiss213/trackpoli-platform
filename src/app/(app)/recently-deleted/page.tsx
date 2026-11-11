import type { Metadata } from "next";
import { Placeholder } from "@/features/shell/Placeholder";

export const metadata: Metadata = { title: "Recently deleted · TrackPoli Admin" };

// Guarded placeholder route (TP1-06); the Recently deleted screen arrives in its own ticket.
export default function Page() {
  return <Placeholder title="Recently deleted" />;
}
