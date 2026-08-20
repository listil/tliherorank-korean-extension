// Fetches tlidb.com's public i18n JSON exports and regenerates
// data/dictionary.json. Re-run this whenever a new season adds heroes,
// skills, or items that should be translated.
//
//   node scripts/build-dictionary.mjs

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { mergeDictionary } from "./mergeDictionary.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT_PATH = path.join(ROOT, "data", "dictionary.json");

const CACHE_BUST = Date.now();
const URLS = {
  enCommon: `https://tlidb.com/i18n/en.json?_=${CACHE_BUST}`,
  koCommon: `https://tlidb.com/i18n/ko.json?_=${CACHE_BUST}`,
  enAutocomplete: `https://tlidb.com/i18n/autocomplete_en.json?_=${CACHE_BUST}`,
  koAutocomplete: `https://tlidb.com/i18n/autocomplete_ko.json?_=${CACHE_BUST}`,
};

async function fetchJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  }
  return res.json();
}

async function main() {
  console.log("Fetching tlidb.com i18n data...");
  const [enCommon, koCommon, enAutocomplete, koAutocomplete] = await Promise.all([
    fetchJson(URLS.enCommon),
    fetchJson(URLS.koCommon),
    fetchJson(URLS.enAutocomplete),
    fetchJson(URLS.koAutocomplete),
  ]);

  const { dictionary, warnings } = mergeDictionary({
    enCommon,
    koCommon,
    enAutocomplete,
    koAutocomplete,
  });

  const entryCount = Object.keys(dictionary).length;
  console.log(`Merged dictionary: ${entryCount} entries.`);
  if (warnings.length) {
    console.log(`${warnings.length} conflicts resolved (last value wins):`);
    for (const w of warnings.slice(0, 20)) console.log(`  - ${w}`);
    if (warnings.length > 20) console.log(`  ... and ${warnings.length - 20} more`);
  }

  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(dictionary, null, 2) + "\n", "utf-8");
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
