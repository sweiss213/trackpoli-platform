import type { Metadata } from "next";
import { Placeholder } from "@/features/shell/Placeholder";

export const metadata: Metadata = { title: "Settings · TrackPoli Admin" };

// The Settings index (TP1-06 route). The Security sub-page (two-factor, active sessions) already exists at
// /settings/security; the rest of settings arrives in later tasks.
export default function Page() {
  return <Placeholder title="Settings" note="Security settings are at Settings › Security; more settings arrive later." />;
}
