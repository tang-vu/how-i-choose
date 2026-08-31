import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function openWorkspace(page: Page) {
  await page.goto("/demo/");
  await expect(page.getByRole("heading", { level: 1, name: "Maya — synthetic sample" })).toBeVisible();
  const continueButton = page.getByRole("button", { name: "Continue with current local data" });
  if (await continueButton.isVisible()) {
    await continueButton.focus();
    await page.keyboard.press("Enter");
  }
}

test("essential owner controls support keyboard activation and a working skip link", async ({ page }) => {
  await page.goto("/demo/");
  await expect(page.getByRole("heading", { name: /start with your signals/i })).toBeVisible();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#workspace-main")).toBeFocused();

  const continueButton = page.getByRole("button", { name: "Continue with current local data" });
  await continueButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Maya — synthetic sample" })).toBeVisible();

  const start = page.getByRole("button", { name: "Start human rehearsal" });
  await start.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Rehearsal active", { exact: true })).toBeVisible();

  const pause = page.getByRole("button", { name: "Pause", exact: true });
  await pause.focus();
  await page.keyboard.press("Space");
  await expect(page.getByText("Paused.", { exact: true })).toBeVisible();

  const resume = page.getByRole("button", { name: "Resume", exact: true });
  await resume.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Rehearsal active", { exact: true })).toBeVisible();

  const amber = page.getByRole("button", { name: /Amber — not sure/ });
  await amber.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".safety-bar")).toContainText("Pending: not sure");
});

test("forced colors and reduced motion retain semantics without blocking axe", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await openWorkspace(page);

  const transitionDurationSeconds = await page.locator(".signal-button").first().evaluate(
    (element) => Number.parseFloat(getComputedStyle(element).transitionDuration),
  );
  expect(transitionDurationSeconds).toBeLessThanOrEqual(0.00001);
  await expect(page.getByRole("button", { name: /Red — stop/ })).toBeVisible();

  await page.getByRole("button", { name: "Agent rehearsal" }).click();
  await expect(page.getByText(/ChatGPT can collaborate/i)).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
});

test("320 CSS pixel reflow keeps the page and persistent actions reachable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await openWorkspace(page);
  await page.getByRole("button", { name: "Start human rehearsal" }).click();

  const reflow = await page.evaluate(() => ({
    horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    offenders: [...document.querySelectorAll<HTMLElement>("body *")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          element: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${element.className ? `.${String(element.className).split(" ").join(".")}` : ""}`,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .filter(({ left, right }) => left < -1 || right > window.innerWidth + 1),
  }));
  expect(reflow.horizontalOverflow, JSON.stringify(reflow.offenders)).toBeLessThanOrEqual(1);
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Stop", exact: true }).first()).toBeVisible();
});

test("print media isolates the support guide and keeps its boundary statement", async ({ page }) => {
  await openWorkspace(page);
  await page.getByLabel("Allowed communication channels").selectOption("text");
  await expect(page.getByText("Draft · visible owner review required", { exact: true })).toBeVisible();
  await page.emulateMedia({ media: "print" });

  await expect(page.locator("#support-guide")).toBeVisible();
  await expect(page.locator(".product-header")).toBeHidden();
  await expect(page.getByText("Ask me directly whenever possible.", { exact: false })).toBeVisible();
  await expect(page.getByText("Draft · visible owner review required", { exact: true })).toBeVisible();
});
