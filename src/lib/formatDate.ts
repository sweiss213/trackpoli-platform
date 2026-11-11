// Locale-aware date/time formatting for the admin UI (Q-C-10, Q-C-11).
//
// Why a formatter and not a hand-rolled "DD-MM-YYYY" string: usability-ux-universal-design
// (content-and-plain-language) requires formatting dates "per locale", and the interface locale is
// en-GB (Q-C-11), whose conventional order IS day-month-year (Q-C-10). So we render through
// Intl.DateTimeFormat("en-GB"), which yields day-month-year without us encoding the order by hand.
//
// Timestamps are STORED in UTC (Q-C-10; compliance-data-lifecycle audit-logging: "precise, synchronized
// timestamp (UTC, NTP-synced)"). By default these helpers render in the runtime's own time zone — on the
// client that is the admin's zone (Q-C-10, "display in the admin's time zone") — and formatDateTimeWithZone
// adds the zone name for detail views (Q-C-10). Pass `timeZone` to pin the zone (e.g. "UTC") when a value
// must render identically on the server and the client to avoid a hydration mismatch.

const LOCALE = "en-GB" as const;

/** Coerce a Date | ISO string | epoch-ms into a valid Date, or null if it cannot be parsed. */
function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Day-month-year, e.g. "03/04/2026" (en-GB order, Q-C-10). Empty string for an invalid/absent value. */
export function formatDate(
  value: Date | string | number | null | undefined,
  options: { timeZone?: string } = {},
): string {
  const d = toDate(value);
  if (!d) return "";
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: options.timeZone,
  }).format(d);
}

/** Day-month-year with 24-hour time, e.g. "03/04/2026, 14:05". Empty string for an invalid/absent value. */
export function formatDateTime(
  value: Date | string | number | null | undefined,
  options: { timeZone?: string } = {},
): string {
  const d = toDate(value);
  if (!d) return "";
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: options.timeZone,
  }).format(d);
}

/** Date, time and zone name for detail views, e.g. "03/04/2026, 14:05 GMT" (Q-C-10, zone shown on detail). */
export function formatDateTimeWithZone(
  value: Date | string | number | null | undefined,
  options: { timeZone?: string } = {},
): string {
  const d = toDate(value);
  if (!d) return "";
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
    timeZone: options.timeZone,
  }).format(d);
}
