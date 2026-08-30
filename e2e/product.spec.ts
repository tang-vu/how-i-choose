import { expect, test } from "@playwright/test";

async function openWorkspace(page: import("@playwright/test").Page) {
  await page.goto("/demo/");
  await expect(page.getByRole("heading", { level: 1, name: "Maya — synthetic sample" })).toBeVisible();
  const continueButton = page.getByRole("button", { name: "Continue with current local data" });
  if (await continueButton.isVisible()) await continueButton.click();
}

test("onboarding remains owner-controlled and remembers completion", async ({ page }) => {
  await page.goto("/demo/");
  await expect(page.getByRole("heading", { name: /start with your signals/i })).toBeVisible();
  await page.getByRole("button", { name: "Continue with current local data" }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: /start with your signals/i })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, name: "Maya — synthetic sample" })).toBeVisible();
});

test("profile rule edits persist after reload with a new revision", async ({ page }) => {
  await openWorkspace(page);
  const rule = page.locator(".rule-card").filter({ hasText: "Use text first; speech may also be offered." });
  await rule.getByLabel("Rule wording").fill("Use text only during this rehearsal.");
  await rule.getByRole("button", { name: "Save rule" }).click();
  await expect(page.getByText("revision 2")).toBeVisible();
  await page.reload();
  await expect(page.locator('textarea[name="displayText"]').first()).toHaveValue("Use text only during this rehearsal.");
});

test("human-only practice uses the deterministic partner validator", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "Start human rehearsal" }).click();
  await page.getByRole("button", { name: "Offer the sample one-question turn" }).click();
  await expect(page.getByText("Would morning or afternoon work better?")).toBeVisible();
  await expect(page.getByText(/Accepted under profile revision 1/)).toBeVisible();
  await page.getByRole("button", { name: /Amber — not sure/ }).click();
  await page.getByRole("button", { name: "Acknowledge selected signal" }).click();
  await expect(page.locator(".turn-list")).toContainText("Is morning or afternoon a better time?");
  await expect(page.getByRole("button", { name: "Offer the sample one-question turn" })).toBeEnabled();
});

test("the person selects signals, pauses, resumes, and stops from visible controls", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "Start human rehearsal" }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByText("Paused.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Offer the sample one-question turn" })).toBeDisabled();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByText("Rehearsal active")).toBeVisible();
  await page.getByRole("button", { name: "Stop", exact: true }).first().click();
  await expect(page.getByText("Stopped.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Offer the sample one-question turn" })).toBeDisabled();
});

test("blank profile scenario requires visible review before practice", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "New blank profile" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Untitled communication profile" })).toBeVisible();
  await page.getByRole("button", { name: "Review this scenario" }).click();
  await page.getByRole("button", { name: "Approve scenario" }).click();
  await page.getByRole("button", { name: "Start human rehearsal" }).click();
  await expect(page.getByText("Rehearsal active")).toBeVisible();
});

test("export and import remain explicit human file actions", async ({ page }) => {
  await openWorkspace(page);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("how-i-choose-profile.json");
  const path = await download.path();
  expect(path).not.toBeNull();
  await page.locator('input[type="file"]').setInputFiles(path!);
  await expect(page.getByText("The validated local JSON file was imported.")).toBeAttached();
});

test("accessibility preferences change presentation without removing controls", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "Start human rehearsal" }).click();
  await page.getByLabel("High contrast").check();
  await page.getByLabel(/Quiet mode/).check();
  await page.getByLabel("Plain language").check();
  await page.getByLabel("Reduced motion").check();
  await page.getByLabel("Text size").selectOption("1.3");
  await expect(page.locator(".product-app")).toHaveAttribute("data-contrast", "high");
  await expect(page.locator(".product-app")).toHaveAttribute("data-quiet", "true");
  await expect(page.locator(".product-app")).toHaveAttribute("data-reduced-motion", "true");
  await expect(page.getByRole("button", { name: "Stop", exact: true }).first()).toBeVisible();
});

test("scenario templates require review and the last profile draft edit can be undone", async ({ page }) => {
  await openWorkspace(page);
  await page.getByLabel("Scenario template").selectOption("library-meetup");
  await expect(page.getByRole("heading", { name: "Plan a library meetup" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Review this scenario" })).toBeVisible();

  await page.getByRole("button", { name: "Reset judge demo" }).click();
  await page.getByLabel("Allowed communication channels").selectOption("text");
  await expect(page.getByLabel("Allowed communication channels")).toHaveValue("text");
  await page.getByRole("button", { name: "Undo last draft edit" }).click();
  await expect(page.getByLabel("Allowed communication channels")).toHaveValue("text,speech");
  await expect(page.locator(".revision-strip")).toContainText("revision 3");
});
