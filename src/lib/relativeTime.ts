// Pure relative-time formatting for the UI. Kept out of the components (components AGENTS.md: "No business
// math. Money/date/eligibility calculations belong in a service or lib/, not fused into JSX") so the date
// arithmetic is unit-testable on its own. Presentational rounding only — it makes no decision; the values
// it formats (e.g. a lockout's end time) are owned and decided server-side.

// "in N minutes" / "in N hours" until the given ISO instant, rounded up. Returns "shortly" for a missing,
// unparseable, or already-past time, so the caller never shows a negative or NaN duration.
export function formatTimeUntil(iso: string | null): string {
  if (!iso) return "shortly";
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return "shortly";
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) return `in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.ceil(minutes / 60);
  return `in ${hours} hour${hours === 1 ? "" : "s"}`;
}
