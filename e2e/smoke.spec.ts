import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const path of ["/", "/demo/"] as const) {
  test(`${path} renders without serious accessibility findings`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("status")).toContainText(/Site tools (available|unavailable)/);

    const results = await new AxeBuilder({ page }).analyze();
    const releaseBlocking = results.violations.filter(({ impact }) => impact === "serious" || impact === "critical");
    expect(releaseBlocking).toEqual([]);
  });
}

test("narrow viewport keeps primary actions reachable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto("/");
  await expect(page.getByRole("link", { name: /try maya.*synthetic demo/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create a blank profile" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Practice Room" })).toHaveAttribute("href", "/demo/#practice-room");
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
});
