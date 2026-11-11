import { test, expect, type Page } from "@playwright/test";
import { createHmac } from "node:crypto";

// Full-stack role-based-access scenario (E2E-08, ADR-0012). Gated on E2E_FULL_STACK so the credential-free CI
// run skips it; it needs a local Supabase stack (migrations + the 7-person seed with the access-token hook
// enabled), the app, and Cloudflare Turnstile TEST keys. Like the other full-stack specs it will need CI
// iteration before it is promoted. It signs in as a plain Administrator (role 'admin', not a manager),
// completes forced enrolment to reach aal2, then proves the manager route and API are closed to them.

const ADMIN = "abe@example.test"; // a seeded administrator (role 'admin', not a manager), no factor yet
const PASSWORD = "LocalOnly-Passw0rd!";

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

test.describe("E2E-08: an Administrator is denied the manager route and API", () => {
  test.skip(!process.env.E2E_FULL_STACK, "requires the full Supabase stack + seed + Turnstile test keys");

  test("an Admin opening /admins gets the forbidden page, and the manager API returns 403", async ({ page }) => {
    await signInAndEnrol(page);

    // The manager navigation is not shown to an Administrator.
    await expect(page.getByRole("link", { name: "Admin management" })).toHaveCount(0);

    // Typing the manager URL lands on the forbidden screen (middleware redirect).
    await page.goto("/admin/admins");
    await expect(page.getByRole("heading", { name: "You don't have access to this page" })).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/forbidden/);

    // Calling the manager API directly returns 403.
    const response = await page.request.get("/admin/api/admins");
    expect(response.status()).toBe(403);
  });
});
