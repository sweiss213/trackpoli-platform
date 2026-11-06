import { test, expect } from "@playwright/test";

// Credential-free password-recovery UI suite (TP1-03). Runs against `next dev` with no Supabase env, so
// each submit reaches the REAL route and exercises the real UI for the no-backend path. The full recovery
// flow (E2E-05: identical screens for known/unknown, mail only to the known address, single-use reset) needs
// the full stack + Inbucket and lives in e2e/password-reset.full-stack.spec.ts.

test.describe("Forgot-password request screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/forgot-password");
  });

  test("renders the request form", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send reset link" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to sign in" })).toBeVisible();
    await expect(page.getByText("Reset links expire after 24 hours and can be used only once.")).toBeVisible();
  });

  test("keeps Send reset link disabled until an email is entered", async ({ page }) => {
    const submit = page.getByRole("button", { name: "Send reset link" });
    await expect(submit).toBeDisabled();
    await page.getByLabel("Email", { exact: true }).fill("amara@trackpoli.org");
    await expect(submit).toBeEnabled();
  });

  test("shows a single generic notice (no account detail) when the request cannot complete", async ({ page }) => {
    await page.getByLabel("Email", { exact: true }).fill("amara@trackpoli.org");
    await page.getByRole("button", { name: "Send reset link" }).click();
    // No backend in this run, so the request fails generically. Scope to the form's alert (Next injects its
    // own empty role="alert" route announcer in the body). The copy reveals nothing about the account.
    const alert = page.getByRole("form", { name: "Reset your password" }).getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toHaveText("Please complete the verification and try again.");
  });
});

test.describe("Set-new-password screen without a recovery session", () => {
  test("shows the expired-link state, not the form", async ({ page }) => {
    await page.goto("/admin/reset-password");
    await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Request a new link" })).toBeVisible();
    await expect(page.getByLabel("New password", { exact: true })).toHaveCount(0);
  });
});

test.describe("Continue page (/auth/confirm)", () => {
  test("with no token, shows the expired-link state", async ({ page }) => {
    await page.goto("/admin/auth/confirm");
    await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Request a new link" })).toBeVisible();
  });

  test("with a token, waits for an explicit Continue and never exchanges on load", async ({ page }) => {
    await page.goto("/admin/auth/confirm?token_hash=sometokenhash&type=recovery");
    // The page must NOT auto-exchange: it shows the Continue gate, so a scanner's GET cannot consume it.
    await expect(page.getByRole("heading", { name: "Continue to reset password" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Cancel" })).toBeVisible();
    await expect(
      page.getByText("This link can be used only once and expires 24 hours after it was sent."),
    ).toBeVisible();

    // Clicking Continue triggers the exchange; with no backend it fails to the error state.
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Something went wrong" })).toBeVisible();
  });
});
