// tliherorank.com renders hero portrait tooltips as
// "<Class> <HeroName> | <Trait>" (e.g. "Scent Weaver Sage | Licorice Note").
// tlidb.com's i18n/{lang}.json exports the same info but with the class name
// and hero name concatenated with NO space ("Scent WeaverSage"), which never
// matches the real tooltip text. tlidb.com's own /en/Hero and /ko/Hero pages
// render the correctly-spaced version, so we scrape those directly (they
// list all hero+trait combos in the same order in both languages) and patch
// data/dictionary.json with correctly-spaced entries.
//
//   node scripts/build-hero-combos.mjs

import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { normalize } from "./mergeDictionary.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DICTIONARY_PATH = path.join(ROOT, "data", "dictionary.json");

export async function fetchPageLines(url) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const lines = await page.evaluate(() =>
      document.body.innerText.split("\n").map((l) => l.trim()).filter(Boolean)
    );
    return lines;
  } finally {
    await browser.close();
  }
}

async function scrapeHeroPage(url) {
  const lines = await fetchPageLines(url);
  // Combo lines are "<Class> <Hero> | <Trait>" or "<Class><sep><Hero>|<Trait>"
  // - always contain "|" and always come right after "Reset".
  const startIdx = lines.indexOf("Reset");
  const comboLines = (startIdx === -1 ? lines : lines.slice(startIdx + 1)).filter((l) =>
    l.includes("|")
  );
  return comboLines.map((line) => {
    const [title, trait] = line.split("|").map((s) => s.trim());
    return { title, trait };
  });
}

export async function scrapeHeroCombos() {
  // Sequential (not Promise.all) - two concurrent chromium.launch() calls
  // have been flaky in this environment.
  const enCombos = await scrapeHeroPage("https://tlidb.com/en/Hero");
  const koCombos = await scrapeHeroPage("https://tlidb.com/ko/Hero");
  return { enCombos, koCombos };
}

async function main() {
  console.log("Scraping tlidb.com/en/Hero and /ko/Hero for correctly-spaced hero+trait names...");
  const { enCombos, koCombos } = await scrapeHeroCombos();

  if (enCombos.length !== koCombos.length) {
    console.warn(
      `WARNING: en (${enCombos.length}) and ko (${koCombos.length}) hero combo counts differ - ` +
        `pairing by position may be wrong. Continuing anyway.`
    );
  }

  const dictionary = JSON.parse(await readFile(DICTIONARY_PATH, "utf-8"));
  const count = Math.min(enCombos.length, koCombos.length);
  let added = 0;

  for (let i = 0; i < count; i++) {
    const en = enCombos[i];
    const ko = koCombos[i];
    if (!en.title || !en.trait || !ko.title || !ko.trait) continue;

    const fullKey = normalize(`${en.title} | ${en.trait}`);
    const fullValue = normalize(`${ko.title} | ${ko.trait}`);
    dictionary[fullKey] = fullValue;
    added++;

    const traitKey = normalize(en.trait);
    const traitValue = normalize(ko.trait);
    if (traitKey && traitValue && traitKey !== traitValue && !(traitKey in dictionary)) {
      dictionary[traitKey] = traitValue;
      added++;
    }
  }

  const sorted = Object.fromEntries(
    Object.entries(dictionary).sort(([a], [b]) => a.localeCompare(b))
  );
  await writeFile(DICTIONARY_PATH, JSON.stringify(sorted, null, 2) + "\n", "utf-8");
  console.log(`Patched ${added} entries (${count} hero+trait combos found). Wrote ${DICTIONARY_PATH}`);
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
