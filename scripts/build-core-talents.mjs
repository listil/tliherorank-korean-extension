// Restores "Core Talent Node" translations (e.g. "Gale" -> "가속") that
// mergeDictionary.mjs deliberately skips: tlidb.com's autocomplete_*.json
// gives every one of these 163 nodes the same placeholder value ("Talent"),
// and the en/ko arrays do NOT list same-value entries in matching order (see
// mergeDictionary.mjs), so positional pairing there is unsafe.
//
// tlidb.com/{en,ko}/Talent has a "Core Talent Node /163" tab that lists them
// as "<Name>\n<Profession>\n<description...>" in a fixed, confirmed-matching
// order between languages. We use the (already-known) profession names as
// anchors: whenever a line equals a known profession name, the line right
// before it is a node name.
//
//   node scripts/build-core-talents.mjs

import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { normalize } from "./mergeDictionary.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DICTIONARY_PATH = path.join(ROOT, "data", "dictionary.json");
const UI_STRINGS_PATH = path.join(ROOT, "data", "ui-strings.json");

async function fetchCoreTalentLines(lang, tabTarget) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`https://tlidb.com/${lang}/Talent`, {
      waitUntil: "networkidle",
      timeout: 45000,
    });
    await page.waitForTimeout(1500);
    // tlidb.com's tab links have used both data-bs-target and plain href for this.
    await page.click(`[data-bs-target="${tabTarget}"], a[data-bs-toggle="tab"][href="${tabTarget}"]`);
    await page.waitForTimeout(1500);
    const lines = await page.evaluate(() =>
      document.body.innerText.split("\n").map((l) => l.trim()).filter(Boolean)
    );
    const startIdx = lines.indexOf("Reset");
    return startIdx === -1 ? lines : lines.slice(startIdx + 1);
  } finally {
    await browser.close();
  }
}

function extractNodeNames(lines, professionNames) {
  const names = [];
  for (let i = 1; i < lines.length; i++) {
    if (professionNames.has(lines[i])) {
      names.push(lines[i - 1]);
    }
  }
  return names;
}

async function main() {
  const uiStrings = JSON.parse(await readFile(UI_STRINGS_PATH, "utf-8"));

  // The 32 profession names we already curated by hand (God of Might ...
  // Nether King) double as reliable anchors for parsing this page.
  const PROFESSIONS_EN = [
    "God of Might", "Goddess of Hunting", "Goddess of Knowledge", "God of War",
    "Goddess of Deception", "God of Machines", "The Brave", "Onslaughter",
    "Warlord", "Warrior", "Marksman", "Bladerunner", "Druid", "Assassin",
    "Magister", "Arcanist", "Elementalist", "Prophet", "Shadowdancer", "Ronin",
    "Ranger", "Sentinel", "Shadowmaster", "Psychic", "Warlock", "Lich",
    "Machinist", "Steel Vanguard", "Alchemist", "Artisan", "New God", "Nether King",
  ];
  const professionsEnSet = new Set(PROFESSIONS_EN);
  const professionsKoSet = new Set(PROFESSIONS_EN.map((en) => uiStrings[en]).filter(Boolean));

  console.log("Fetching tlidb.com/en/Talent Core Talent Node tab...");
  const enLines = await fetchCoreTalentLines("en", "#CoreTalentNode");
  console.log("Fetching tlidb.com/ko/Talent Core Talent Node tab...");
  const koLines = await fetchCoreTalentLines("ko", "#핵심재능포인트");

  const enNames = extractNodeNames(enLines, professionsEnSet);
  const koNames = extractNodeNames(koLines, professionsKoSet);
  console.log(`Extracted ${enNames.length} en names, ${koNames.length} ko names.`);

  const dictionary = JSON.parse(await readFile(DICTIONARY_PATH, "utf-8"));
  const count = Math.min(enNames.length, koNames.length);
  let added = 0;
  for (let i = 0; i < count; i++) {
    const key = normalize(enNames[i]);
    const value = normalize(koNames[i]);
    if (!key || !value || key === value) continue;
    if (!(key in dictionary)) {
      dictionary[key] = value;
      added++;
    }
  }

  const sorted = Object.fromEntries(Object.entries(dictionary).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(DICTIONARY_PATH, JSON.stringify(sorted, null, 2) + "\n", "utf-8");
  console.log(`Added ${added} core talent node entries. Wrote ${DICTIONARY_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
