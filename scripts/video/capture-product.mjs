import { readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { ensureDirectory, outputRoot, readNarration } from "./shared.mjs";

const target = (process.argv[2] ?? process.env.VIDEO_TARGET ?? "https://how-i-choose.vercel.app").replace(/\/$/, "");
const narration = await readNarration();
const rawDirectory = path.join(outputRoot, "raw-stills");
const frameDirectory = path.join(outputRoot, "frames");
await ensureDirectory(rawDirectory);
await ensureDirectory(frameDirectory);

const browser = await chromium.launch();

const visualFacts = {
  landing: ["LOCAL-FIRST", "NO ACCOUNT", "SYNTHETIC DATA"],
  rules: ["ONE QUESTION", "12 WORDS", "TWO OPTIONS"],
  authority: ["8 SCOPED TOOLS", "OWNER ENABLED", "DENY BY DEFAULT"],
  "practice-ready": ["QUESTION COUNT", "WORD LIMIT", "REJECT BEFORE DISPLAY"],
  "accepted-turn": ["SAME DOMAIN ENGINE", "VISIBLE AFTER VALIDATION"],
  signal: ["AUTHORSHIP: PERSON", "MEANING: NOT SURE"],
  revision: ["COMPARE AND SWAP", "PROFILE REVISION 2"],
  stopped: ["TERMINAL STATE", "NO FURTHER TURNS"],
  audit: ["PARTNER ADHERENCE", "NO PERSON SCORE"],
  guide: ["DRAFT UNTIL REVIEW", "RATIFY: OWNER ONLY"],
};

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function compositeHtml(segment, screenshotDataUrl, index) {
  const facts = visualFacts[segment.visual] ?? [];
  const isOpening = index === 0;
  const number = String(index + 1).padStart(2, "0");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  html, body { width: 1920px; height: 1080px; margin: 0; overflow: hidden; }
  body {
    font-family: "Segoe UI", Arial, sans-serif;
    color: #f8f5ed;
    background:
      radial-gradient(circle at 82% 18%, rgba(68, 116, 255, .22), transparent 34%),
      radial-gradient(circle at 18% 88%, rgba(255, 177, 74, .15), transparent 30%),
      linear-gradient(135deg, #091124 0%, #101936 48%, #09101f 100%);
  }
  body::before {
    content: "";
    position: absolute;
    inset: 0;
    opacity: .12;
    background-image: linear-gradient(rgba(255,255,255,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px);
    background-size: 80px 80px;
    mask-image: linear-gradient(to right, black, transparent 70%);
  }
  .brand { position: absolute; left: 86px; top: 64px; display: flex; align-items: center; gap: 17px; z-index: 3; }
  .mark { width: 46px; height: 46px; position: relative; border: 2px solid #f8f5ed; border-radius: 16px; }
  .mark::before { content: ""; position: absolute; width: 15px; height: 15px; right: -8px; bottom: -7px; background: #f05054; border: 5px solid #101936; border-radius: 50%; }
  .mark::after { content: ""; position: absolute; left: 8px; right: 8px; top: 14px; height: 2px; background: #f8f5ed; box-shadow: 0 8px 0 #f8f5ed; }
  .brand strong { display: block; font-size: 22px; letter-spacing: -.02em; }
  .brand span { display: block; color: #aeb8d5; font-size: 13px; margin-top: 4px; letter-spacing: .12em; text-transform: uppercase; }
  .count { position: absolute; right: 86px; top: 70px; color: #94a3c7; font: 600 15px/1 "Bahnschrift", "Segoe UI", sans-serif; letter-spacing: .18em; }
  .copy { position: absolute; left: 88px; top: ${isOpening ? 300 : 302}px; width: ${isOpening ? 610 : 520}px; z-index: 3; }
  .chapter { color: #f5b64c; font: 700 16px/1.2 "Bahnschrift", "Segoe UI", sans-serif; letter-spacing: .21em; margin: 0 0 26px; }
  h1 { font-family: Georgia, serif; font-weight: 400; font-size: ${isOpening ? 86 : 68}px; line-height: .98; letter-spacing: -.052em; margin: 0; max-width: 700px; text-wrap: balance; }
  .rule { width: 72px; height: 4px; border-radius: 4px; background: #f05054; margin: 34px 0 30px; }
  .facts { display: flex; flex-wrap: wrap; gap: 10px; max-width: 510px; }
  .facts span { border: 1px solid rgba(187, 203, 240, .33); background: rgba(20, 31, 65, .72); color: #dfe6f8; border-radius: 999px; padding: 10px 14px 9px; font: 650 12px/1 "Bahnschrift", "Segoe UI", sans-serif; letter-spacing: .12em; }
  .window {
    position: absolute;
    ${isOpening ? "left: 760px; top: 166px; width: 1074px; height: 752px;" : "left: 650px; top: 156px; width: 1184px; height: 790px;"}
    border-radius: 24px;
    overflow: hidden;
    background: #f5f1e8;
    border: 1px solid rgba(213, 224, 255, .4);
    box-shadow: 0 50px 110px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.08) inset;
    transform: rotate(${isOpening ? "1.1" : "0"}deg);
  }
  .chrome { height: 52px; display: flex; align-items: center; gap: 9px; padding: 0 19px; background: #17213f; border-bottom: 1px solid rgba(255,255,255,.1); }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: #f05054; }
  .dot:nth-child(2) { background: #f5b64c; }
  .dot:nth-child(3) { background: #5fc58b; }
  .address { margin-left: 15px; color: #bec8e3; font-size: 12px; letter-spacing: .055em; }
  .screen { width: 100%; height: calc(100% - 52px); object-fit: cover; object-position: top center; display: block; }
  .window::after { content: ""; position: absolute; inset: 52px 0 0; pointer-events: none; box-shadow: inset 0 0 70px rgba(9,17,36,.12); }
  .footer { position: absolute; left: 88px; right: 86px; bottom: 57px; display: flex; justify-content: space-between; align-items: center; color: #8997bc; font: 600 12px/1 "Bahnschrift", "Segoe UI", sans-serif; letter-spacing: .15em; z-index: 3; }
  .pulse { display: inline-flex; align-items: center; gap: 10px; color: #cbd4ed; }
  .pulse::before { content: ""; width: 8px; height: 8px; background: #5fc58b; border-radius: 50%; box-shadow: 0 0 0 7px rgba(95,197,139,.1); }
  .accent { position: absolute; left: 0; bottom: 0; height: 7px; width: 100%; background: linear-gradient(90deg, #5b7cfa 0 25%, #8c6eea 25% 50%, #f5b64c 50% 75%, #f05054 75%); }
</style>
</head>
<body>
  <div class="brand"><div class="mark"></div><div><strong>How I Choose</strong><span>My signals · My pace</span></div></div>
  <div class="count">${number} / ${String(narration.segments.length).padStart(2, "0")}</div>
  <main class="copy">
    <p class="chapter">${escapeHtml(segment.chapter)}</p>
    <h1>${escapeHtml(segment.headline)}</h1>
    <div class="rule"></div>
    <div class="facts">${facts.map((fact) => `<span>${escapeHtml(fact)}</span>`).join("")}</div>
  </main>
  <section class="window" aria-label="Real deployed product capture">
    <div class="chrome"><i class="dot"></i><i class="dot"></i><i class="dot"></i><span class="address">how-i-choose.vercel.app/${segment.visual === "landing" ? "" : "demo/"}</span></div>
    <img class="screen" src="${screenshotDataUrl}" alt="">
  </section>
  <div class="footer"><span class="pulse">REAL PRODUCT UI · SYNTHETIC MAYA PROFILE</span><span>OPEN ALPHA · BUILD 26A870BD792D</span></div>
  <div class="accent"></div>
</body>
</html>`;
}

const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
  colorScheme: "light",
});
await context.addInitScript(() => localStorage.setItem("how-i-choose-onboarded", "yes"));
const page = await context.newPage();

async function settle() {
  await page.waitForTimeout(450);
}

async function capture(name, selector) {
  if (selector) {
    const locator = page.locator(selector).first();
    await locator.scrollIntoViewIfNeeded();
    await settle();
  }
  const filePath = path.join(rawDirectory, `${name}.png`);
  await page.screenshot({ path: filePath });
  return filePath;
}

try {
  await page.goto(`${target}/`, { waitUntil: "networkidle" });
  const captures = { landing: await capture("landing") };

  await page.goto(`${target}/demo/`, { waitUntil: "networkidle" });
  const continueButton = page.getByRole("button", { name: "Continue with current local data" });
  if (await continueButton.isVisible()) await continueButton.click();
  await page.getByRole("button", { name: "Reset judge demo" }).click();

  captures.rules = await capture("rules", "#my-signals");
  captures.authority = await capture("authority", "#practice-room");
  captures["practice-ready"] = await capture("practice-ready", "#practice-room");

  await page.getByRole("button", { name: "Start human rehearsal" }).click();
  await page.getByRole("button", { name: "Offer the sample one-question turn" }).click();
  captures["accepted-turn"] = await capture("accepted-turn", "#practice-room");

  await page.getByRole("button", { name: /Amber — not sure/ }).click();
  captures.signal = await capture("signal", "#practice-room");
  await page.getByRole("button", { name: "Acknowledge selected signal" }).click();

  await page.getByLabel("Allowed communication channels").selectOption("text");
  captures.revision = await capture("revision", "#my-signals");

  await page.getByRole("button", { name: "Stop", exact: true }).first().click();
  captures.stopped = await capture("stopped", "#practice-room");
  captures.audit = await capture("audit", "#rehearsal-audit");
  captures.guide = await capture("guide", "#support-guide");

  const composer = await context.newPage();
  for (const [index, segment] of narration.segments.entries()) {
    const screenshot = await readFile(captures[segment.visual]);
    const dataUrl = `data:image/png;base64,${screenshot.toString("base64")}`;
    await composer.setContent(compositeHtml(segment, dataUrl, index), { waitUntil: "load" });
    await composer.screenshot({ path: path.join(frameDirectory, `${segment.id}.png`) });
  }
  await composer.close();
  process.stdout.write(`Captured ${narration.segments.length} product frames from ${target}.\n`);
} finally {
  await context.close();
  await browser.close();
}
