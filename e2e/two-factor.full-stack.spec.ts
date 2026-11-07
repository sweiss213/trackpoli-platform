import { test, expect, type Page, type Response } from "@playwright/test";
import { createHmac } from "node:crypto";

// Full-stack two-factor scenario (E2E-11, ADR-0009). Gated on E2E_FULL_STACK so the credential-free CI run
// skips it; it needs a local Supabase stack (migrations + the 7-person seed), the app, and Cloudflare
// Turnstile TEST keys. Like e2e/password-reset.full-stack.spec.ts it will need CI iteration before it is
// promoted to run on every PR. The TOTP secrets are read straight from the app's own API responses (the
// enrol "begin" and the replace "authorize"), which is more robust than scraping the key off the screen.
//
// A note on TOTP replay: Supabase rejects a code that was already used, and a code is stable for a 30s
// window, so when the same secret is verified twice (sign-in step-up, then as the "current" code in
// replacement) the test waits for a fresh window between uses. That timing is the most likely thing to
// adjust on the first CI run.

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

/** RFC 6238 TOTP (SHA-1, 6 digits, 30s step) for the given secret and time step. */
function totp(secret: string, step: number): string {
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

function currentStep(): number {
  return Math.floor(Date.now() / 1000 / 30);
}

/** Produce a code for `secret` that differs from any already used, waiting for the next 30s window if needed. */
async function freshCode(secret: string, used: Set<string>): Promise<string> {
  let code = totp(secret, currentStep());
  while (used.has(code)) {
    await new Promise((r) => setTimeout(r, 2000));
    code = totp(secret, currentStep());
  }
  used.add(code);
  return code;
}

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/admin/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  const submit = page.getByRole("button", { name: "Sign in" });
  await expect(submit).toBeEnabled(); // waits for the Turnstile test token
  await submit.click();
}

async function secretFrom(response: Response): Promise<string> {
  const body = (await response.json()) as { secret?: string; enrol?: { secret?: string } };
  const secret = body.secret ?? body.enrol?.secret;
  expect(secret, "the API response should carry a TOTP secret").toBeTruthy();
  return secret as string;
}

test.describe("E2E-11: two-factor enrolment, step-up, and device replacement", () => {
  test.skip(!process.env.E2E_FULL_STACK, "requires the full Supabase stack + seed + Turnstile test keys");

  test("enrol at first sign-in, a code is required next sign-in, then replace the device", async ({ page }) => {
    const used = new Set<string>();

    // 1) First sign-in forces enrolment before any data route.
    await signIn(page, ADMIN, PASSWORD);
    await expect(page).toHaveURL(/\/admin\/mfa\/enrol/);

    const beginResponse = page.waitForResponse(
      (r) => r.url().includes("/admin/api/mfa/enrol") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Continue" }).click();
    const secret1 = await secretFrom(await beginResponse);

    await expect(page.getByRole("heading", { name: "Scan the QR code" })).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("6-digit code").fill(await freshCode(secret1, used));
    await page.getByRole("button", { name: "Verify and turn on" }).click();

    await expect(page.getByRole("heading", { name: "Two-step verification is on" })).toBeVisible();
    await page.getByRole("button", { name: "Go to dashboard" }).click();
    await expect(page).toHaveURL(/\/admin$/);

    // 2) Sign out, then sign in again — a code is required (step-up), not a straight pass to the app.
    await page.request.post("/admin/api/sign-out");
    await signIn(page, ADMIN, PASSWORD);
    await expect(page).toHaveURL(/\/admin\/sign-in\/verify/);
    await page.getByLabel("Verification code").fill(await freshCode(secret1, used));
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page).toHaveURL(/\/admin$/);

    // 3) Replace the device in Security settings: password + current code -> new device -> new code.
    await page.goto("/admin/settings/security");
    await page.getByRole("button", { name: "Replace device" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Get started" }).click(); // the overview/intro step
    await dialog.getByLabel("Current password").fill(PASSWORD);
    await dialog.getByLabel("Code from your current device").fill(await freshCode(secret1, used));
    const authorizeResponse = page.waitForResponse(
      (r) => r.url().includes("/admin/api/mfa/replace") && r.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Continue" }).click();
    const secret2 = await secretFrom(await authorizeResponse);

    await expect(dialog.getByRole("heading", { name: "Add your new device" })).toBeVisible();
    await dialog.getByRole("button", { name: "Continue" }).click();
    await dialog.getByLabel("6-digit code").fill(await freshCode(secret2, used));
    await dialog.getByRole("button", { name: "Replace device" }).click();

    await expect(dialog.getByRole("heading", { name: "Authenticator device replaced" })).toBeVisible();
  });
});
