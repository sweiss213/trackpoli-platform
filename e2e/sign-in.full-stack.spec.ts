import { test, expect } from "@playwright/test";

// Full-stack sign-in scenarios. Gated on E2E_FULL_STACK so the credential-free CI run skips them; they
// need a local Supabase stack (migrations + the 7-person seed), the Edge Functions served, and Cloudflare
// Turnstile TEST keys (site 1x00000000000000000000AA / secret 1x0000000000000000000000000000000AA, which
// always pass). e2e.yml's full-stack job wires that env in; it will need the usual CI iteration to go
// green the first time, like the pgTAP database job.

test.describe("E2E-02: repeated wrong passwords lock the account", () => {
  test.skip(!process.env.E2E_FULL_STACK, "requires the full Supabase stack + seed + Turnstile test keys");

  test("five wrong passwords show one generic message each time, then a pause", async ({ page }) => {
    const email = "mia@example.test"; // a seeded Administrator Manager
    await page.goto("/admin/sign-in");
    const submit = page.getByRole("button", { name: "Sign in", exact: true });

    for (let attempt = 1; attempt <= 5; attempt++) {
      await page.getByLabel("Email", { exact: true }).fill(email);
      await page.getByLabel("Password", { exact: true }).fill(`definitely-wrong-${attempt}`);
      await expect(submit).toBeEnabled(); // waits for the Turnstile test token
      await submit.click();

      if (attempt < 5) {
        // Each failure before the pause shows the SAME generic message — never "no such user". Scope to
        // the form's alert (Next injects its own empty role="alert" route announcer in the body).
        await expect(page.getByRole("form", { name: "Sign in" }).getByRole("alert")).toHaveText(
          "The email or password you entered is incorrect.",
        );
      }
    }

    // The fifth failure trips the per-account pause -> the locked view (and auth.account_locked is logged).
    await expect(page.getByRole("heading", { name: "Account temporarily locked" })).toBeVisible();
  });
});

// E2E-01 (the seeded manager signs in with password + 2FA and reaches the dashboard, with a sign-in event)
// is not yet runnable: the two-factor verification screen and the dashboard are later tickets. TP1-02
// builds password sign-in, Continue with Google, and the lockout only.
//
// E2E-16 (Continue with Google: an invited email reaches 2FA enrolment; an email with no profile is signed
// out with the generic message and no account created) is blocked: Google OAuth needs a real Google client
// and the production domain (Q-1-21, domain-blocked), and the 2FA-enrolment screen is a later ticket. The
// "no profile -> signed out, no account" rule is already unit-tested in src/features/auth (oauthCallback).
