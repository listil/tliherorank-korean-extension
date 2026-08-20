// tliherorank.com's "Hero Trait" sidebar filter lists individual talent-tree
// node names (e.g. "Pungent Stimulant Salt"), not just the 27 top-level
// hero+trait combos. Those node names live *inside* each combo's own
// tlidb.com detail page (e.g. https://tlidb.com/en/Licorice_Note), as the
// title directly above a "Require lv N" line - they are not in i18n/*.json
// or the search index at all, so they were missed by build-dictionary.mjs
// and build-hero-combos.mjs.
//
// This scrapes all 27 combo detail pages (en + ko) and pulls out every
// "<Name>\nRequire lv N" -> "<이름>\n레벨 조건 N" pair.
//
//   node scripts/build-trait-nodes.mjs

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { normalize } from "./mergeDictionary.mjs";
import { scrapeHeroCombos, fetchPageLines } from "./build-hero-combos.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DICTIONARY_PATH = path.join(ROOT, "data", "dictionary.json");

const EN_LEVEL_LINE = /^Require lv \d+$/;
const KO_LEVEL_LINE = /^레벨 조건 \d+$/;

function slugify(name) {
  // tlidb page slugs are the display name with spaces -> underscores and
  // apostrophes stripped (e.g. "Vendetta's Sting" -> "Vendettas_Sting").
  return name.replace(/'/g, "").trim().replace(/\s+/g, "_");
}

function extractNodeNames(lines, levelLineRegex) {
  const names = [];
  for (let i = 1; i < lines.length; i++) {
    if (levelLineRegex.test(lines[i])) {
      const name = lines[i - 1];
      // Guard against picking up the trait's own title line or other noise:
      // real node names are short and don't end in sentence punctuation.
      if (name && name.length <= 60 && !/[.!?]$/.test(name)) {
        names.push(name);
      }
    }
  }
  return names;
}

async function scrapeTraitNodes(traitName) {
  const slug = slugify(traitName);
  const url = (lang) => `https://tlidb.com/${lang}/${slug}`;
  try {
    const enLines = await fetchPageLines(url("en"));
    const koLines = await fetchPageLines(url("ko"));
    const enNames = extractNodeNames(enLines, EN_LEVEL_LINE);
    const koNames = extractNodeNames(koLines, KO_LEVEL_LINE);
    return { slug, enNames, koNames };
  } catch (err) {
    console.warn(`  skip "${traitName}" (${slug}): ${err.message}`);
    return { slug, enNames: [], koNames: [] };
  }
}

async function main() {
  console.log("Re-fetching the 27 hero+trait combo names from tlidb.com/en/Hero...");
  const { enCombos } = await scrapeHeroCombos();
  const traitNames = [...new Set(enCombos.map((c) => c.trait).filter(Boolean))];
  console.log(`Scraping ${traitNames.length} skill-tree detail pages for talent node names...`);

  const dictionary = JSON.parse(await readFile(DICTIONARY_PATH, "utf-8"));
  let added = 0;
  let pagesWithMismatch = 0;

  for (const traitName of traitNames) {
    const { slug, enNames, koNames } = await scrapeTraitNodes(traitName);
    if (enNames.length === 0) continue;
    if (enNames.length !== koNames.length) {
      pagesWithMismatch++;
      console.warn(
        `  "${slug}": en has ${enNames.length} node names, ko has ${koNames.length} - pairing by position up to the shorter length`
      );
    }
    const count = Math.min(enNames.length, koNames.length);
    for (let i = 0; i < count; i++) {
      const key = normalize(enNames[i]);
      const value = normalize(koNames[i]);
      if (!key || !value || key === value) continue;
      if (!(key in dictionary)) {
        dictionary[key] = value;
        added++;
      }
    }
  }

  const sorted = Object.fromEntries(
    Object.entries(dictionary).sort(([a], [b]) => a.localeCompare(b))
  );
  await writeFile(DICTIONARY_PATH, JSON.stringify(sorted, null, 2) + "\n", "utf-8");
  console.log(
    `Added ${added} new talent-node entries (${pagesWithMismatch} pages had a en/ko count mismatch). Wrote ${DICTIONARY_PATH}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
