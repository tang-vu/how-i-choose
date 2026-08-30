import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chromium } from "@playwright/test";

const baseUrl = process.env.PRODUCTION_URL ?? "https://how-i-choose.vercel.app";
const expectedCommit = process.env.EXPECTED_BUILD_COMMIT ?? execFileSync(
  "git",
  ["rev-parse", "--short=12", "HEAD"],
  { encoding: "utf8" },
).trim();
const expectedOrigin = new URL(baseUrl).origin;

const response = await fetch(baseUrl, { redirect: "follow" });
assert.equal(response.status, 200, "production root must return 200");
const headers = response.headers;
assert.match(headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
assert.equal(headers.get("x-frame-options"), "DENY");
assert.equal(headers.get("x-content-type-options"), "nosniff");
assert.match(headers.get("permissions-policy") ?? "", /microphone=\(\)/);
assert.equal(headers.get("referrer-policy"), "strict-origin-when-cross-origin");
assert.match(headers.get("strict-transport-security") ?? "", /max-age=/);

for (const path of ["/robots.txt", "/favicon.svg", "/og.svg", "/product-preview.png"]) {
  const asset = await fetch(new URL(path, baseUrl));
  assert.equal(asset.status, 200, `${path} must return 200`);
}
const missing = await fetch(new URL("/release-smoke-missing/", baseUrl));
assert.equal(missing.status, 404, "unknown route must return 404");

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
const unexpectedOrigins = new Set();
const consoleErrors = [];
page.on("request", (request) => {
  const origin = new URL(request.url()).origin;
  if (origin !== expectedOrigin) unexpectedOrigins.add(origin);
});
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

const rootNavigation = await page.goto(baseUrl, { waitUntil: "networkidle" });
assert.equal(rootNavigation?.status(), 200);
await page.getByRole("heading", { level: 1, name: "Make your signals easier to follow." }).waitFor();
assert.match(await page.locator("footer").innerText(), new RegExp(`build ${expectedCommit}`));
assert.match(await page.getByRole("status").innerText(), /Site tools unavailable/);

const demoNavigation = await page.goto(new URL("/demo/", baseUrl).toString(), { waitUntil: "networkidle" });
assert.equal(demoNavigation?.status(), 200);
await page.getByRole("heading", { level: 1, name: "Maya — synthetic sample" }).waitFor();
const continueButton = page.getByRole("button", { name: "Continue with current local data" });
if (await continueButton.isVisible()) await continueButton.click();
await page.getByRole("button", { name: "Reset judge demo" }).click();
await page.getByRole("button", { name: "Start human rehearsal" }).click();
await page.getByText("Rehearsal active", { exact: true }).waitFor();
await page.getByRole("button", { name: "Offer the sample one-question turn" }).click();
await page.locator(".turn-list").getByText("Would morning or afternoon work better?", { exact: false }).waitFor();

await context.setOffline(true);
await page.getByRole("button", { name: /Blue — more time/ }).click();
await page.locator(".safety-bar").getByText(/Pending: need more time/).waitFor();
await page.getByRole("button", { name: "Acknowledge selected signal" }).click();
await page.locator(".turn-list").getByText("I will wait until you choose another visible signal.", { exact: false }).waitFor();
await context.setOffline(false);

assert.deepEqual([...unexpectedOrigins], [], "the loaded app must not request third-party origins");
assert.deepEqual(consoleErrors, [], "production pages must not emit console errors");
await browser.close();

process.stdout.write(`${JSON.stringify({
  ok: true,
  baseUrl,
  buildCommit: expectedCommit,
  routes: ["/", "/demo/", "/robots.txt", "/favicon.svg", "/og.svg", "/product-preview.png", "/404"],
  securityHeaders: true,
  externalOrigins: 0,
  offlineAfterLoad: true,
  siteToolsFallback: "unavailable",
}, null, 2)}\n`);
