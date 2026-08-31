import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

import { chromium } from "@playwright/test";

const target = process.argv[2] ?? "https://how-i-choose.vercel.app";
const artifactDirectory = process.argv[3] ?? path.join(os.tmpdir(), `how-i-choose-a11y-${Date.now()}`);
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

await mkdir(artifactDirectory, { recursive: true });

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function openWorkspace(page) {
  await page.goto(`${target}/demo/`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1, name: "Maya — synthetic sample" }).waitFor();
}

async function pressFocused(locator, key = "Enter") {
  await locator.scrollIntoViewIfNeeded();
  await locator.focus();
  await sleep(450);
  await locator.press(key);
  await sleep(700);
}

function sendChromeZoomKeys() {
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      "$chrome = Get-Process chrome | Where-Object { $_.Path -eq $env:HIC_CHROME_PATH -and $_.MainWindowTitle -like '*How I Choose*' } | Sort-Object StartTime -Descending | Select-Object -First 1; if (-not $chrome) { throw 'Chrome window not found' }; $signature = '[DllImport(\"user32.dll\")] public static extern void SwitchToThisWindow(IntPtr hWnd, bool fAltTab);'; Add-Type -MemberDefinition $signature -Name NativeMethods -Namespace AccessibilitySmoke; Add-Type -AssemblyName System.Windows.Forms; [AccessibilitySmoke.NativeMethods]::SwitchToThisWindow($chrome.MainWindowHandle, $true); [System.Windows.Forms.SendKeys]::SendWait('^0'); 1..8 | ForEach-Object { [System.Windows.Forms.SendKeys]::SendWait('^='); Start-Sleep -Milliseconds 150 }",
    ],
    { env: { ...process.env, HIC_CHROME_PATH: chromePath }, stdio: "inherit" },
  );
}

function sendChromeKey(key) {
  const sendKey = {
    heading: "h",
    table: "t",
  }[key];
  assert(sendKey, `Unsupported operating-system key: ${key}`);
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      `$chrome = Get-Process chrome | Where-Object { $_.Path -eq $env:HIC_CHROME_PATH -and $_.MainWindowTitle -like '*How I Choose*' } | Sort-Object StartTime -Descending | Select-Object -First 1; if (-not $chrome) { throw 'Chrome window not found' }; $signature = '[DllImport(\"user32.dll\")] public static extern void SwitchToThisWindow(IntPtr hWnd, bool fAltTab);'; Add-Type -MemberDefinition $signature -Name NativeMethods -Namespace AccessibilitySmoke; Add-Type -AssemblyName System.Windows.Forms; [AccessibilitySmoke.NativeMethods]::SwitchToThisWindow($chrome.MainWindowHandle, $true); [System.Windows.Forms.SendKeys]::SendWait('${sendKey}')`,
    ],
    { env: { ...process.env, HIC_CHROME_PATH: chromePath }, stdio: "inherit" },
  );
}

function captureChromeWindow(filePath) {
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      "$signature = '[DllImport(\"user32.dll\")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect); public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }'; Add-Type -MemberDefinition $signature -Name WindowCapture -Namespace AccessibilitySmoke; Add-Type -AssemblyName System.Drawing; $chrome = Get-Process chrome | Where-Object { $_.Path -eq $env:HIC_CHROME_PATH -and $_.MainWindowTitle -like '*How I Choose*' } | Sort-Object StartTime -Descending | Select-Object -First 1; if (-not $chrome) { throw 'Chrome window not found' }; $rect = New-Object AccessibilitySmoke.WindowCapture+RECT; [AccessibilitySmoke.WindowCapture]::GetWindowRect($chrome.MainWindowHandle, [ref]$rect) | Out-Null; $width = $rect.Right - $rect.Left; $height = $rect.Bottom - $rect.Top; $bitmap = New-Object System.Drawing.Bitmap $width, $height; $graphics = [System.Drawing.Graphics]::FromImage($bitmap); try { $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, [System.Drawing.Size]::new($width, $height)); $bitmap.Save($env:HIC_SCREENSHOT_PATH, [System.Drawing.Imaging.ImageFormat]::Png) } finally { $graphics.Dispose(); $bitmap.Dispose() }",
    ],
    { env: { ...process.env, HIC_CHROME_PATH: chromePath, HIC_SCREENSHOT_PATH: filePath }, stdio: "inherit" },
  );
}

async function captureReflow(page, label) {
  const metrics = await page.evaluate(() => {
    const isInsideHorizontalScroller = (element) => {
      let ancestor = element.parentElement;
      while (ancestor) {
        const style = getComputedStyle(ancestor);
        if (["auto", "scroll"].includes(style.overflowX) && ancestor.scrollWidth > ancestor.clientWidth) return true;
        ancestor = ancestor.parentElement;
      }
      return false;
    };
    const visibleActions = [...document.querySelectorAll("a, button, input, select, textarea, summary")]
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      });
    const horizontallyClippedActions = visibleActions
      .filter((element) => {
        return !isInsideHorizontalScroller(element);
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          name: element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 100) ?? element.tagName,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .filter(({ left, right, width }) => width <= window.innerWidth && (left < -1 || right > window.innerWidth + 1));

    const clippedText = [];
    const textWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.textContent?.trim() || !node.parentElement) return NodeFilter.FILTER_REJECT;
        const style = getComputedStyle(node.parentElement);
        if (style.display === "none" || style.visibility === "hidden" || isInsideHorizontalScroller(node.parentElement)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    while (textWalker.nextNode()) {
      const node = textWalker.currentNode;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (rect.width <= window.innerWidth && (rect.left < -1 || rect.right > window.innerWidth + 1)) {
          clippedText.push({
            text: node.textContent.trim().slice(0, 100),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
          });
        }
      }
    }

    return {
      cssViewport: { width: window.innerWidth, height: window.innerHeight },
      devicePixelRatio: window.devicePixelRatio,
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      horizontallyClippedActions,
      clippedText,
    };
  });

  captureChromeWindow(path.join(artifactDirectory, `${label}-window.png`));
  assert(metrics.horizontalOverflow <= 1, `${label} has ${metrics.horizontalOverflow}px horizontal page overflow`);
  assert(metrics.horizontallyClippedActions.length === 0, `${label} clips actions: ${JSON.stringify(metrics.horizontallyClippedActions)}`);
  assert(metrics.clippedText.length === 0, `${label} clips text: ${JSON.stringify(metrics.clippedText.slice(0, 8))}`);
  return metrics;
}

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: false,
  args: ["--force-device-scale-factor=1", "--window-size=1440,900", "--disable-features=Translate"],
});

const evidence = { target, artifactDirectory, browserVersion: browser.version(), zoom: {}, screenReaderKeyboard: {} };

try {
  const zoomContext = await browser.newContext({ viewport: null, reducedMotion: "reduce" });
  await zoomContext.addInitScript(() => localStorage.setItem("how-i-choose-onboarded", "yes"));
  const zoomPage = await zoomContext.newPage();
  await zoomPage.goto(target, { waitUntil: "networkidle" });
  await zoomPage.bringToFront();
  await sleep(500);
  const normalMetrics = await zoomPage.evaluate(() => ({ width: window.innerWidth, dpr: window.devicePixelRatio }));
  sendChromeZoomKeys();
  await sleep(800);
  const zoomMetrics = await zoomPage.evaluate(() => ({ width: window.innerWidth, dpr: window.devicePixelRatio }));
  const zoomRatio = normalMetrics.width / zoomMetrics.width;
  assert(zoomRatio >= 3.85 && zoomRatio <= 4.15, `Expected 400% Chrome zoom; measured ${Math.round(zoomRatio * 100)}%`);

  evidence.zoom.normal = normalMetrics;
  evidence.zoom.zoomed = zoomMetrics;
  evidence.zoom.measuredPercent = Math.round(zoomRatio * 100);
  evidence.zoom.landing = await captureReflow(zoomPage, "zoom-400-landing");

  await openWorkspace(zoomPage);
  evidence.zoom.workspaceReady = await captureReflow(zoomPage, "zoom-400-workspace-ready");

  await pressFocused(zoomPage.getByRole("button", { name: "Start human rehearsal" }));
  await zoomPage.getByText("Rehearsal active", { exact: true }).waitFor();
  evidence.zoom.practiceActive = await captureReflow(zoomPage, "zoom-400-practice-active");

  await pressFocused(zoomPage.getByRole("button", { name: "Pause", exact: true }));
  await zoomPage.getByText("Paused.", { exact: true }).waitFor();
  await zoomPage.getByRole("button", { name: "Resume", exact: true }).scrollIntoViewIfNeeded();
  await zoomPage.getByRole("button", { name: "Stop", exact: true }).first().scrollIntoViewIfNeeded();
  evidence.zoom.practicePaused = await captureReflow(zoomPage, "zoom-400-practice-paused");

  await pressFocused(zoomPage.getByRole("button", { name: "Resume", exact: true }));
  await pressFocused(zoomPage.getByRole("button", { name: "Stop", exact: true }).first());
  await zoomPage.getByText("Stopped.", { exact: true }).waitFor();
  evidence.zoom.practiceStopped = await captureReflow(zoomPage, "zoom-400-practice-stopped");

  await zoomPage.locator("#support-guide").scrollIntoViewIfNeeded();
  captureChromeWindow(path.join(artifactDirectory, "zoom-400-support-guide-window.png"));
  evidence.zoom.supportGuideBoundaryVisible = await zoomPage.getByText("Ask me directly whenever possible.", { exact: false }).isVisible();
  assert(evidence.zoom.supportGuideBoundaryVisible, "Support-guide boundary is not visible at 400% zoom");
  await zoomContext.close();

  const readerContext = await browser.newContext({ viewport: null, reducedMotion: "reduce" });
  await readerContext.addInitScript(() => localStorage.setItem("how-i-choose-onboarded", "yes"));
  const readerPage = await readerContext.newPage();
  await openWorkspace(readerPage);
  await readerPage.bringToFront();
  await sleep(1_000);

  await readerPage.locator("body").press("Control+Home");
  await readerPage.keyboard.press("Tab");
  evidence.screenReaderKeyboard.firstTab = await readerPage.evaluate(() => ({
    text: document.activeElement?.textContent?.trim(),
    href: document.activeElement?.getAttribute("href"),
  }));
  assert(evidence.screenReaderKeyboard.firstTab.text === "Skip to main content", "First page Tab did not reach the skip link");
  assert(evidence.screenReaderKeyboard.firstTab.href === "#workspace-title", "Skip link did not target the workspace heading");
  await readerPage.keyboard.press("Enter");
  await sleep(700);
  evidence.screenReaderKeyboard.skipTarget = await readerPage.evaluate(() => document.activeElement?.id);
  assert(evidence.screenReaderKeyboard.skipTarget === "workspace-title", "Skip link did not focus the workspace heading");

  await pressFocused(readerPage.getByRole("button", { name: "Start human rehearsal" }));
  await readerPage.getByText("Rehearsal active", { exact: true }).waitFor();
  const amberSignal = readerPage.getByRole("button", { name: /Amber.+not sure/ });
  evidence.screenReaderKeyboard.signalText = (await amberSignal.innerText()).replace(/\s+/g, " ").trim();
  await pressFocused(amberSignal);
  await readerPage.locator(".safety-bar").getByText(/Pending: not sure/).waitFor();
  await pressFocused(readerPage.getByRole("button", { name: "Pause", exact: true }));
  await readerPage.getByText("Paused.", { exact: true }).waitFor();
  await pressFocused(readerPage.getByRole("button", { name: "Resume", exact: true }));
  await pressFocused(readerPage.getByRole("button", { name: "Stop", exact: true }).first());
  await readerPage.getByText("Stopped.", { exact: true }).waitFor();

  await pressFocused(readerPage.getByRole("button", { name: "Reset judge demo" }));
  await pressFocused(readerPage.getByRole("button", { name: "Agent rehearsal" }));
  await readerPage.getByText(/ChatGPT can collaborate/i).waitFor();
  await readerPage.getByRole("link", { name: "Support Guide" }).focus();
  await sleep(500);
  await readerPage.getByRole("link", { name: "Support Guide" }).press("Enter");
  await sleep(500);
  await readerPage.bringToFront();
  sendChromeKey("heading");
  await sleep(1_000);
  sendChromeKey("table");
  await sleep(1_000);

  evidence.screenReaderKeyboard.finalState = {
    agentAccess: await readerPage.getByText("Scoped access on", { exact: true }).isVisible(),
    supportGuideBoundary: await readerPage.getByText("Ask me directly whenever possible.", { exact: false }).isVisible(),
    signalAccessibleNameMatched: await readerPage.getByRole("button", { name: /Amber.+not sure/ }).count() === 1,
  };
  await readerContext.close();
} finally {
  await browser.close();
}

await writeFile(path.join(artifactDirectory, "browser-evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
