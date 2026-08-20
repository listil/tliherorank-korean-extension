// Loads the unpacked extension in a real Chromium instance via Playwright,
// visits tliherorank.com, and reports whether translated Korean text shows
// up on the page. Extensions require a persistent (headful) context.
//
//   node scripts/verify-extension.mjs

import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

async function main() {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), "tli-ext-profile-"));

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${ROOT}`,
      `--load-extension=${ROOT}`,
    ],
  });

  try {
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto("https://tliherorank.com/", { waitUntil: "networkidle" });
    // Give the SPA + content script a moment to render and translate.
    await page.waitForTimeout(3000);

    const bodyText = await page.evaluate(() => document.body.innerText);
    const koreanCharCount = (bodyText.match(/[가-힣]/g) || []).length;

    console.log(`Korean characters found on page: ${koreanCharCount}`);
    console.log("--- first 1500 chars of body text ---");
    console.log(bodyText.slice(0, 1500));

    const screenshotPath = path.join(ROOT, "scripts", "verify-screenshot.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`Screenshot saved to ${screenshotPath}`);

    if (koreanCharCount === 0) {
      console.error("WARNING: no Korean characters detected - translation may not be working.");
      process.exitCode = 1;
    }
  } finally {
    await context.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
