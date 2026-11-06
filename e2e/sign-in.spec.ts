import { test, expect } from "@playwright/test";

// Credential-free sign-in UI suite. Runs against `next dev` with no Supabase env: a submit reaches the
// real /admin/api/sign-in route, which (with no backend configured) returns an error, so the real generic
// error UI is exercised end-to-end. The lockout/events scenario (E2E-02) needs the full stack and lives
// in sign-in.full-stack.spec.ts.

test.describe("Admin sign-in screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/sign-in");
  });

  test("renders the sign-in form", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  });

  test("keeps Sign in disabled until email and password are entered", async ({ page }) => {
    const submit = page.getByRole("button", { name: "Sign in", exact: true });
    await expect(submit).toBeDisabled();
    await page.getByLabel("Email", { exact: true }).fill("admin@trackpoli.org");
    await page.getByLabel("Password", { exact: true }).fill("a-password-1234");
    await expect(submit).toBeEnabled();
  });

  test("toggles password visibility", async ({ page }) => {
    const password = page.getByLabel("Password", { exact: true });
    await expect(password).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(password).toHaveAttribute("type", "password");
  });

  test("shows a single generic error for bad credentials, leaking no detail", async ({ page }) => {
    await page.getByLabel("Email", { exact: true }).fill("admin@trackpoli.org");
    await page.getByLabel("Password", { exact: true }).fill("wrong-password-1234");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    // Scope to the form's alert — Next injects its own empty role="alert" route announcer in the body.
    const alert = page.getByRole("form", { name: "Sign in" }).getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toHaveText("The email or password you entered is incorrect.");
  });
});
