// Pure merge logic for tlidb.com's i18n JSON exports. No Node-only APIs are
// used here so this file could also run inside a browser context later if
// a runtime refresh feature is ever added.

export function normalize(text) {
  if (typeof text !== "string") return "";
  return text.trim().replace(/\s+/g, " ");
}

// i18n/{lang}.json: { "Table|field|key": "localized string", ... }
// Keys are identical across languages, so this is a direct 1:1 zip.
function mergeCommonI18n(enCommon, koCommon, out, warnings) {
  for (const [key, enValue] of Object.entries(enCommon)) {
    const koValue = koCommon[key];
    if (!koValue) continue;
    addEntry(out, warnings, enValue, koValue, `common:${key}`);
  }
}

// i18n/autocomplete_{lang}.json: [{ value, desc, label }, ...]
// `value` is normally a unique per-entry slug, so grouping by it and zipping
// positionally is safe. BUT at least one category ("Core Talent Node") gives
// every single entry the same literal value ("Talent") instead of a real
// slug - and the en/ko arrays are NOT guaranteed to list same-value entries
// in the same relative order (confirmed: en index 29 of the "Talent" group
// is "Gale", ko index 29 is "예민" - completely unrelated talents). Zipping
// those positionally silently produces confidently-wrong translations,
// which is worse than no translation, so any group with more than one
// member is skipped entirely rather than guessed at.
function groupByValue(list) {
  const groups = new Map();
  for (const entry of list) {
    if (!entry || typeof entry.value !== "string") continue;
    if (!groups.has(entry.value)) groups.set(entry.value, []);
    groups.get(entry.value).push(entry);
  }
  return groups;
}

function mergeAutocomplete(enList, koList, out, warnings) {
  const enGroups = groupByValue(enList);
  const koGroups = groupByValue(koList);

  for (const [value, enEntries] of enGroups) {
    const koEntries = koGroups.get(value);
    if (!koEntries) continue;
    if (enEntries.length > 1 || koEntries.length > 1) {
      warnings.push(
        `skipped ambiguous autocomplete group "${value}" (en:${enEntries.length} ko:${koEntries.length}) - ` +
          `value isn't a unique per-entry slug, so positional pairing can't be trusted`
      );
      continue;
    }
    const count = Math.min(enEntries.length, koEntries.length);
    for (let i = 0; i < count; i++) {
      const enLabel = enEntries[i].label;
      const koLabel = koEntries[i].label;
      if (!enLabel || !koLabel) continue;
      addEntry(out, warnings, enLabel, koLabel, `autocomplete:${value}#${i}`);
    }
  }
}

// Combo keys like "Rehan-Anger" -> "BerserkerRehan | Anger" pack a hero's
// short name and a skill/trait name together. tliherorank.com usually
// renders these in separate table cells, so also emit the split pieces as
// standalone dictionary entries to widen coverage.
function mergeComboNames(enCommon, koCommon, out, warnings) {
  for (const [enKey, enValue] of Object.entries(enCommon)) {
    if (!enKey.includes("-") || !enValue.includes("|")) continue;
    const koValue = koCommon[enKey];
    if (!koValue || !koValue.includes("|")) continue;

    const [enHeroShort, enSkill] = splitOnce(enKey, "-");
    const [enFullName, enSkillFromValue] = splitOnce(enValue, "|");
    const [koFullName, koSkillFromValue] = splitOnce(koValue, "|");
    if (enHeroShort === undefined || koFullName === undefined) continue;

    const enSkillName = normalize(enSkillFromValue ?? enSkill ?? "");
    const koSkillName = normalize(koSkillFromValue ?? "");
    if (enSkillName && koSkillName) {
      addEntry(out, warnings, enSkillName, koSkillName, `combo-skill:${enKey}`);
    }

    // enFullName looks like "BerserkerRehan" (class + hero name, no space).
    // We cannot reliably split it into class/name without a class-name
    // list, so only use it if it happens to already equal the short name
    // (rare) - otherwise skip; the combo key itself is still kept as-is
    // by mergeCommonI18n() above.
    if (normalize(enFullName) && normalize(koFullName)) {
      addEntry(out, warnings, enFullName, normalize(koFullName), `combo-fullname:${enKey}`);
    }
  }
}

function splitOnce(str, sep) {
  const idx = str.indexOf(sep);
  if (idx === -1) return [str, undefined];
  return [str.slice(0, idx), str.slice(idx + sep.length)];
}

function addEntry(out, warnings, enRaw, koRaw, source) {
  const key = normalize(enRaw);
  const value = normalize(koRaw);
  if (!key || !value) return;
  if (key === value) return; // nothing to translate
  const existing = out.get(key);
  if (existing && existing !== value) {
    warnings.push(`conflict for "${key}": "${existing}" -> "${value}" (from ${source})`);
  }
  out.set(key, value);
}

/**
 * @param {object} params
 * @param {object} params.enCommon - i18n/en.json
 * @param {object} params.koCommon - i18n/ko.json
 * @param {Array}  params.enAutocomplete - i18n/autocomplete_en.json
 * @param {Array}  params.koAutocomplete - i18n/autocomplete_ko.json
 * @returns {{ dictionary: Record<string,string>, warnings: string[] }}
 */
export function mergeDictionary({ enCommon, koCommon, enAutocomplete, koAutocomplete }) {
  const out = new Map();
  const warnings = [];

  // Order matters: later calls win on key conflicts. autocomplete.json is
  // the biggest but least curated source (tooltips, buffs, generic terms),
  // so it goes first. i18n/{lang}.json covers the site's main nav/equipment
  // categories and is applied last so it wins ambiguous cases like "Shield"
  // (equipment slot "방패" vs. buff tooltip "보호막").
  mergeAutocomplete(enAutocomplete, koAutocomplete, out, warnings);
  mergeCommonI18n(enCommon, koCommon, out, warnings);
  mergeComboNames(enCommon, koCommon, out, warnings);

  const dictionary = Object.fromEntries([...out.entries()].sort(([a], [b]) => a.localeCompare(b)));
  return { dictionary, warnings };
}
