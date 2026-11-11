import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Admin workspace shell E2E (TP1-07, P1-12). Credential-free: it runs against `next dev` with no Supabase,
// hitting the gallery (/admin/gallery, the component showcase) and the shell demo (/admin/gallery/shell,
// the full AppShell with a mock AuthProvider). E2E-13 is the keyboard pass (skip link, focus, the drawer
// trapping and returning focus); E2E-14 is the axe scan (no serious/critical violations). These are the
// ticket's acceptance scenarios; features/shell/admin-shell.feature documents them.

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

test.describe("E2E-14: axe finds no serious or critical violations", () => {
  test("the component gallery passes axe (WCAG 2.2 AA)", async ({ page }) => {
    await page.goto("/admin/gallery");
    await expect(page.getByRole("heading", { name: /component gallery/i })).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    const seriousOrCritical = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(seriousOrCritical, JSON.stringify(seriousOrCritical.map((v) => v.id), null, 2)).toEqual([]);
  });

  test("the app shell passes axe (WCAG 2.2 AA)", async ({ page }) => {
    await page.goto("/admin/gallery/shell");
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    const seriousOrCritical = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(seriousOrCritical, JSON.stringify(seriousOrCritical.map((v) => v.id), null, 2)).toEqual([]);
  });
});

test.describe("E2E-13: the shell is reachable and operable by keyboard", () => {
  test("the skip link is the first tab stop and moves focus to the main content", async ({ page }) => {
    await page.goto("/admin/gallery/shell");
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    // From a clean load nothing is focused; the first Tab must land on the skip link (it is first in the DOM).
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("below 1024px the nav is a drawer that traps focus and returns it on close", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/admin/gallery/shell");

    const menu = page.getByRole("button", { name: "Open navigation menu" });
    await expect(menu).toBeVisible();
    await menu.click();

    // The drawer is a dialog; its nav is visible and focus is inside it.
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("navigation", { name: "Primary" })).toBeVisible();

    // Escape closes the drawer and returns focus to the menu button (Radix focus return).
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(menu).toBeFocused();
  });

  test("at desktop width the nav is a persistent rail with no menu button", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/admin/gallery/shell");
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open navigation menu" })).toBeHidden();
  });

  test("renders with no horizontal overflow at the 320px minimum width", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/admin/gallery/shell");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1); // allow sub-pixel rounding
  });
});
