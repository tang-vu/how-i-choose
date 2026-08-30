import { chromium } from "@playwright/test";

const target = process.argv[2] ?? "https://how-i-choose.vercel.app/demo/";
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: "reduce" });
  await context.addInitScript(() => localStorage.setItem("how-i-choose-onboarded", "yes"));
  const page = await context.newPage();
  await page.goto(target, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Reset judge demo" }).click();
  await page.getByRole("button", { name: "Start human rehearsal" }).click();
  await page.getByRole("button", { name: "Offer the sample one-question turn" }).click();
  await page.getByRole("button", { name: "Agent rehearsal" }).click();
  await page.locator("#practice-room").screenshot({ path: "public/product-preview.png" });
} finally {
  await browser.close();
}
