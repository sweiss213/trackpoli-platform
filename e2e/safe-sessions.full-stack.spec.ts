import { test, expect, type Page } from "@playwright/test";
import { createHmac } from "node:crypto";

// Full-stack safe-sessions scenarios (E2E-06, E2E-07; ADR-0010). Gated on E2E_FULL_STACK so the credential-
// free CI run skips it; it needs a local Supabase stack (migrations + the 7-person seed), the app, Cloudflare
// Turnstile TEST keys, AND the session limits shortened via env so the idle timeout fires in seconds:
//   SESSION_IDLE_MS=6000 SESSION_WARN_LEAD_MS=3000 SESSION_ACTIVITY_PING_MS=1000
// Those are read server-side (src/lib/config.ts) and passed to the client by the layout, which is exactly the
// "limits are config, not code" acceptance criterion. Like the other full-stack specs it will need CI
// iteration before it is promoted to run on every PR.

const ADMIN = "abe@example.test"; // a seeded administrator with a password and no factor yet
const PASSWORD = "LocalOnly-Passw0rd!"; // the seed's local-only password (supabase/seed.sql)

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Decode(input: string): Buffer {
  const clean = input.replace(/[^A-Z2-7]/gi, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | BASE32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}
function totp(secret: string): string {
  const step = Math.floor(Date.now() / 1000 / 30);
  const counter = Buffer.alloc(8);
  counter.writeBigInt64BE(BigInt(step));
  const hmac = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

// Sign in and complete forced first-time enrolment, leaving the page on /admin at aal2.
async function signInAndEnrol(page: Page): Promise<void> {
  await page.goto("/admin/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(ADMIN);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  const submit = page.getByRole("button", { name: "Sign in" });
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect(page).toHaveURL(/\/admin\/mfa\/enrol/);
  const begin = page.waitForResponse((r) => r.url().includes("/admin/api/mfa/enrol") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Continue" }).click();
  const secret = ((await (await begin).json()) as { secret?: string }).secret as string;
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("6-digit code").fill(totp(secret));
  await page.getByRole("button", { name: "Verify and turn on" }).click();
  await page.getByRole("button", { name: "Go to dashboard" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test.describe("Safe sessions (full stack)", () => {
  test.skip(!process.env.E2E_FULL_STACK, "requires the full Supabase stack + seed + shortened SESSION_* limits");

  test("E2E-06: an idle session warns, then lands on /session-expired keeping the return path", async ({ page }) => {
    await signInAndEnrol(page);
    await page.goto("/admin/settings/security");

    // With the limits shortened, the idle warning appears, then (doing nothing) the session expires.
    await expect(page.getByRole("alertdialog")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Stay signed in" })).toBeVisible();

    await expect(page).toHaveURL(/\/admin\/session-expired\?/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Your session has expired" })).toBeVisible();
    // The return path is kept so "Sign in again" comes back to where they were.
    expect(new URL(page.url()).searchParams.get("next")).toContain("/admin/settings/security");
  });

  test("E2E-07: signing out in one tab signs out the other within two seconds", async ({ context }) => {
    const tab1 = await context.newPage();
    await signInAndEnrol(tab1);

    const tab2 = await context.newPage();
    await tab2.goto("/admin/settings/security");
    await expect(tab2).toHaveURL(/\/admin\/settings\/security/);

    // Sign out in tab 1 through the idle warning's "Sign out" (which broadcasts over the shared channel).
    await expect(tab1.getByRole("alertdialog")).toBeVisible({ timeout: 15_000 });
    await tab1.getByRole("button", { name: "Sign out" }).click();

    // Tab 2 must leave for sign-in within two seconds via the trackpoli-auth channel.
    await expect(tab2).toHaveURL(/\/admin\/sign-in/, { timeout: 2_000 });
  });
});
