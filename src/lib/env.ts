// Small, pure environment helpers. No framework, no I/O — so they are unit-testable and reusable.
// Reading real env values and building the typed client config belongs to later tasks (P1-06);
// this file only holds the primitives.

/** Require an environment variable to be present and non-empty; throw a clear error otherwise. */
export function requireEnv(name: string, value: string | undefined): string {
  if (value === undefined || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** True only for an absolute http(s) URL — used to validate redirect/base URLs before use. */
export function isAbsoluteHttpUrl(value: string): boolean {
  if (!URL.canParse(value)) return false;
  const protocol = new URL(value).protocol;
  return protocol === "http:" || protocol === "https:";
}
