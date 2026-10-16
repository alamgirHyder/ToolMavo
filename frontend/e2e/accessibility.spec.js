import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:5173";
for (const locale of ["en-US", "de-DE", "ur-PK"]) {
  test(`WCAG 2 A/AA checks for ${locale}`, async ({ browser }) => {
    const context = await browser.newContext({ locale, baseURL });
    const page = await context.newPage();
    for (const route of [
      "/",
      "/#all-tools",
      "/#tool/word-counter",
      "/#tool/image-resizer",
      "/#tool/invoice-generator",
      "/#contact",
    ]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      if (route.includes("/tool/"))
        await expect(page.locator(".workspace")).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        results.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
        route,
      ).toEqual([]);
    }
    await context.close();
  });
}
