(() => {
  "use strict";

  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT"]);
  const TRANSLATABLE_ATTRS = ["placeholder", "aria-label", "title"];
  const DEBOUNCE_MS = 80;

  // Known dynamic label templates on tliherorank.com that embed live counts,
  // so they can never be an exact-match dictionary entry. Matched only
  // against the *entire* normalized node text (anchored), never a substring
  // inside longer prose, to keep the same "no accidental partial matches"
  // guarantee as the dictionary lookup.
  const DYNAMIC_PATTERNS = [
    {
      regex: /^Rows ([\d,]+-[\d,]+) of ([\d,]+) matched players$/,
      replace: (_m, range, total) => `일치한 플레이어 ${total}명 중 ${range}행`,
    },
    {
      regex: /^Page (\d+) of (\d+)$/,
      replace: (_m, page, total) => `페이지 ${page} / ${total}`,
    },
  ];

  // "Include <Hero> <N>" tooltip on hero filter checkboxes (e.g. "Include
  // Sage 1"). Handled separately from HERO_NUMBER_PATTERN because of the
  // "Include " prefix; still only fires via heroNameMap, never as a bare
  // exact-match dictionary entry (see loadDictionary()).
  const INCLUDE_HERO_PATTERN = /^Include ([A-Za-z]+) (\d+)$/;
  // Generic fallback for the same button family when the filter value isn't
  // a hero (e.g. "Include Off The Beaten Track" for a core talent filter).
  const INCLUDE_GENERIC_PATTERN = /^Include (.+)$/;

  function normalize(text) {
    if (typeof text !== "string") return "";
    return text.trim().replace(/\s+/g, " ");
  }

  async function loadDictionary() {
    const [dictionaryRes, uiStringsRes, heroNamesRes] = await Promise.all([
      fetch(chrome.runtime.getURL("data/dictionary.json")),
      fetch(chrome.runtime.getURL("data/ui-strings.json")),
      fetch(chrome.runtime.getURL("data/hero-names.json")),
    ]);
    const [dictionary, uiStrings, heroNames] = await Promise.all([
      dictionaryRes.json(),
      uiStringsRes.json(),
      heroNamesRes.json(),
    ]);

    const map = new Map();
    for (const [en, ko] of Object.entries(dictionary)) {
      map.set(normalize(en), ko);
    }
    // UI strings are curated specifically for this site, so they win on conflicts.
    for (const [en, ko] of Object.entries(uiStrings)) {
      map.set(normalize(en), ko);
    }

    // Hero given names are intentionally kept out of `map`: a bare node like
    // "Rehan" could be a player's username, so they are only ever applied
    // through the "<Hero> <number>" pattern below (e.g. "Rehan 2" -> "리한2"),
    // never as a standalone exact match.
    const heroNameMap = new Map(Object.entries(heroNames).map(([en, ko]) => [normalize(en), ko]));
    const heroNumberPattern = /^([A-Za-z]+) (\d+)$/;

    // Case-insensitive index of the same terms, used only for parsing
    // individual tokens out of "Tags: ..." / "Limited to ..." tooltip lines
    // (see translateTagListLine). Never used for whole-node matching, so it
    // doesn't weaken the exact-match safety guarantee elsewhere.
    const looseMap = new Map();
    for (const [key, value] of map) {
      looseMap.set(key.toLowerCase(), value);
    }

    return { map, heroNameMap, heroNumberPattern, looseMap };
  }

  // Best-effort lookup for a single word/phrase pulled out of a "Tags:" or
  // "Limited to:" tooltip line: tries exact case, then case-insensitive,
  // then the same with a trailing "s" stripped (plural -> singular). Falls
  // back to the original token untranslated rather than guessing.
  function softLookup(token, dictionary) {
    const trimmed = token.trim();
    if (!trimmed) return trimmed;
    const direct = dictionary.map.get(trimmed);
    if (direct) return direct;
    const lower = trimmed.toLowerCase();
    const loose = dictionary.looseMap.get(lower);
    if (loose) return loose;
    if (lower.endsWith("s")) {
      const singular = dictionary.looseMap.get(lower.slice(0, -1));
      if (singular) return singular;
    }
    return trimmed;
  }

  function splitTagList(str) {
    return str
      .replace(/,?\s+and\s+/i, ", ")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const TAG_LIST_PATTERNS = [
    { regex: /^Tags:\s*(.+)$/i, label: "Tags" },
    { regex: /^Limited to\s*(.+?)\.?$/i, label: "Limited to" },
    { regex: /^Requires\s*(.+?)\.?$/i, label: "Requires" },
  ];

  // Single-value labeled lines, e.g. "Core Talent: Lich" (as opposed to the
  // comma-separated lists TAG_LIST_PATTERNS handles). The value is looked up
  // as a whole (profession names like "Lich" are already exact dictionary
  // entries) rather than split into tokens.
  const LABELED_VALUE_PATTERNS = [
    { regex: /^Core Talent:\s*(.+)$/i, label: "Core Talent" },
    { regex: /^Hero Trait:\s*(.+)$/i, label: "Hero Trait" },
  ];

  // Translates one line of a multi-line tooltip. Whole-line exact matches
  // win first; otherwise a handful of known list-shaped lines ("Tags: A, B,
  // C", "Limited to X, Y and Z") are parsed and each item translated
  // individually. Free-form sentences with embedded live numbers (damage %,
  // projectile counts, etc.) never match anything and are left in English -
  // translating those would require reproducing tliherorank.com's internal
  // effect-description templates, which is out of scope here.
  function translateTooltipLine(line, dictionary) {
    const whole = translate(normalize(line), dictionary);
    if (whole) return whole;

    for (const { regex, label } of TAG_LIST_PATTERNS) {
      const m = line.match(regex);
      if (!m) continue;
      const koLabel = dictionary.map.get(label) || label;
      const items = splitTagList(m[1]).map((item) => softLookup(item, dictionary));
      return `${koLabel}: ${items.join(", ")}`;
    }

    for (const { regex, label } of LABELED_VALUE_PATTERNS) {
      const m = line.match(regex);
      if (!m) continue;
      const koLabel = dictionary.map.get(label) || label;
      return `${koLabel}: ${softLookup(m[1], dictionary)}`;
    }

    const sourceMatch = line.match(/^Source:\s*(.+)$/i);
    if (sourceMatch) {
      const koLabel = dictionary.map.get("Source") || "Source";
      return `${koLabel}: ${sourceMatch[1]}`;
    }

    return null;
  }

  function translate(key, dictionary) {
    const direct = dictionary.map.get(key);
    if (direct) return direct;

    const heroMatch = key.match(dictionary.heroNumberPattern);
    if (heroMatch) {
      const koName = dictionary.heroNameMap.get(heroMatch[1]);
      if (koName) return `${koName}${heroMatch[2]}`;
    }

    const includeMatch = key.match(INCLUDE_HERO_PATTERN);
    if (includeMatch) {
      const koName = dictionary.heroNameMap.get(includeMatch[1]);
      if (koName) return `${koName}${includeMatch[2]} 포함`;
    }

    const includeGenericMatch = key.match(INCLUDE_GENERIC_PATTERN);
    if (includeGenericMatch) {
      const koName = dictionary.map.get(includeGenericMatch[1]);
      if (koName) return `${koName} 포함`;
    }

    for (const { regex, replace } of DYNAMIC_PATTERNS) {
      const m = key.match(regex);
      if (m) return replace(...m);
    }

    return null;
  }

  function shouldSkip(element) {
    let node = element;
    while (node) {
      if (node.nodeType === Node.ELEMENT_NODE && SKIP_TAGS.has(node.tagName)) return true;
      if (node.isContentEditable) return true;
      node = node.parentElement;
    }
    return false;
  }

  function translateTextNode(textNode, dictionary) {
    const key = normalize(textNode.nodeValue);
    if (!key) return;
    const translation = translate(key, dictionary);
    if (!translation || translation === textNode.nodeValue) return;
    if (shouldSkip(textNode.parentElement)) return;
    textNode.nodeValue = translation;
  }

  function translateAttributeValue(value, dictionary) {
    const key = normalize(value);
    const whole = translate(key, dictionary);
    if (whole && whole !== value) return whole;

    // Multi-line tooltips (e.g. skill descriptions with live combat numbers)
    // can never match as a whole - they're generated per-row and always
    // differ. Translate what we can line-by-line (name, Tags:, Limited to:,
    // Source:) and leave free-form sentences with embedded numbers in
    // English (see translateTooltipLine).
    if (value.includes("\n")) {
      let changed = false;
      const translatedLines = value.split("\n").map((line) => {
        const translated = translateTooltipLine(line, dictionary);
        if (translated && translated !== line) {
          changed = true;
          return translated;
        }
        return line;
      });
      if (changed) return translatedLines.join("\n");
    }

    return null;
  }

  function translateAttributes(element, dictionary) {
    for (const attr of TRANSLATABLE_ATTRS) {
      const value = element.getAttribute && element.getAttribute(attr);
      if (!value) continue;

      // Multi-line tooltips (skill/pactspirit/talent cards) are eligible for
      // live enrichment from tlidb.com (see setupLiveTooltipEnrichment).
      // Stash the *original* English name once, from the raw untranslated
      // value - later re-walks of an already-translated node must not
      // overwrite it with the Korean text.
      if (attr === "title" && value.includes("\n") && !element.dataset.tliLiveName) {
        const liveName = extractLiveName(value);
        if (liveName) element.dataset.tliLiveName = liveName;
      }

      const translation = translateAttributeValue(value, dictionary);
      if (translation) {
        element.setAttribute(attr, translation);
      }
    }
  }

  // ---- Live tlidb.com lookups (on hover) ------------------------------
  //
  // tlidb.com's own detail pages (e.g. https://tlidb.com/ko/Split_Shot) are
  // server-rendered per-language, so a plain fetch() gets the real Korean
  // page - no headless browser needed. Their skill/item level stats (e.g.
  // "347%") turn out to be fixed per-skill-level values, not per-build
  // computed ones, so they match tliherorank.com's own numbers exactly. This
  // is strictly better than the static dictionary for the long description
  // sentences, so on hover we fetch the live page and upgrade the tooltip
  // text in place; if the page doesn't exist (wrong slug guess, item not on
  // tlidb, network error) we just keep the static translation already shown.
  const liveTooltipCache = new Map(); // slug -> Promise<ParsedCard|null>

  // tlidb.com drops apostrophes, colons and parentheses from page slugs, e.g.
  // "Modularization: Shared Burden (Magnificent)" ->
  // "Modularization_Shared_Burden_Magnificent" (matches autocomplete_en.json's
  // `value` for all but ~10 of ~4800 entries).
  function slugifyForTlidb(name) {
    return name.replace(/['’:()]/g, "").trim().replace(/\s+/g, "_");
  }

  // Most multi-line tooltips start directly with the item's name (skills,
  // pactspirits). Talent filter checkboxes are shaped differently - e.g.
  // "Include Off The Beaten Track\n\nOff The Beaten Track\nCore Talent:
  // Lich\n..." - where the real name is the line right before the "Core
  // Talent:"/"Hero Trait:" label line, not the first line ("Include ...").
  function extractLiveName(rawValue) {
    const lines = rawValue.split("\n");
    for (let i = 1; i < lines.length; i++) {
      if (/^(Core Talent|Hero Trait):/i.test(lines[i].trim())) {
        const prev = lines[i - 1].trim();
        if (prev) return prev;
      }
    }
    return (lines[0] || "").trim() || null;
  }

  // tlidb.com uses different card markup per entity type. Each parser here
  // targets one template; parseTlidbCard tries them in order and returns the
  // first one that finds a name or description.
  const CARD_PARSERS = [
    // Skills (e.g. https://tlidb.com/ko/Split_Shot): title/tags/weapon
    // restriction/description are all clearly labeled.
    (doc) => {
      const card = doc.querySelector(".card.ui_item.popupItem, .card.popupItem");
      if (!card) return null;
      const name = card.querySelector(".card-title")?.textContent?.trim() || null;
      const tags = [...card.querySelectorAll(".tag.tlborder")]
        .map((t) => t.textContent.trim())
        .filter(Boolean);
      const restriction =
        card.querySelector('[data-block="weapon_restrict_description"]')?.textContent?.trim() || null;
      const description =
        card.querySelector(".explicitMod")?.textContent?.trim().replace(/\s*\n\s*/g, "\n") || null;
      if (!name && !description) return null;
      return { name, tags: tags.length ? [tags.join(", ")] : [], extra: restriction ? [restriction] : [], description };
    },
    // Pactspirits (e.g. https://tlidb.com/ko/Elixir_Fairies): name is in
    // .item_rarity100, type/rarity badges are .btn-secondary, and the short
    // summary is [data-src="des_effect"].
    (doc) => {
      const card = doc.querySelector(".card.popupItem.text-center");
      if (!card) return null;
      const name = card.querySelector(".item_rarity100")?.textContent?.trim() || null;
      const tags = [...card.querySelectorAll(".btn-secondary")]
        .map((t) => t.textContent.trim())
        .filter(Boolean);
      const description = card.querySelector('[data-src="des_effect"]')?.textContent?.trim() || null;
      if (!name && !description) return null;
      return { name, tags: tags.length ? [tags.join(", ")] : [], extra: [], description };
    },
    // Core talent nodes (e.g. https://tlidb.com/ko/Gale): plain
    // .card > .card-header (name) + .card-body (description). Tried last
    // since it's the least specific selector - only reached when the more
    // specific skill/pactspirit templates above don't match.
    (doc) => {
      const header = doc.querySelector(".card-header");
      const card = header?.closest(".card");
      if (!card) return null;
      const name = header.textContent?.trim() || null;
      const description = card.querySelector(".card-body")?.textContent?.trim().replace(/\s*\n\s*/g, "\n") || null;
      if (!name && !description) return null;
      return { name, tags: [], extra: [], description };
    },
  ];

  function parseTlidbCard(html) {
    // Swap <br> for a literal newline before parsing so textContent keeps
    // the line breaks from multi-sentence descriptions.
    const withBreaks = html.replace(/<br\s*\/?>/gi, "\n");
    const doc = new DOMParser().parseFromString(withBreaks, "text/html");
    for (const parse of CARD_PARSERS) {
      const result = parse(doc);
      if (result) return result;
    }
    return null;
  }

  function buildTooltipFromCard(card) {
    const lines = [];
    if (card.name) lines.push(card.name);
    for (const tagLine of card.tags) lines.push(`태그: ${tagLine}`);
    for (const line of card.extra) lines.push(line);
    if (card.description) lines.push(card.description);
    lines.push("출처: tlidb.com");
    return lines.join("\n");
  }

  function fetchLiveTooltip(englishName) {
    const slug = slugifyForTlidb(englishName);
    if (!slug) return Promise.resolve(null);
    if (liveTooltipCache.has(slug)) return liveTooltipCache.get(slug);

    // The actual request runs in the background service worker - a content
    // script's fetch() is still bound by the *page's* CORS policy even with
    // host_permissions granted, so a direct cross-origin fetch() here would
    // get blocked.
    const promise = chrome.runtime
      .sendMessage({ type: "fetchTlidb", lang: "ko", slug })
      .then((res) => (res?.ok && res.html ? parseTlidbCard(res.html) : null))
      .catch(() => null);
    liveTooltipCache.set(slug, promise);
    return promise;
  }

  function setupLiveTooltipEnrichment() {
    document.addEventListener(
      "mouseover",
      (event) => {
        const el = event.target.closest && event.target.closest("[data-tli-live-name]");
        if (!el || el.dataset.tliLiveDone) return;
        el.dataset.tliLiveDone = "1";

        fetchLiveTooltip(el.dataset.tliLiveName).then((card) => {
          if (!card) return;
          const newTitle = buildTooltipFromCard(card);
          if (el.getAttribute("title")) el.setAttribute("title", newTitle);
          if (el.getAttribute("aria-label")) el.setAttribute("aria-label", newTitle);
        });
      },
      { passive: true }
    );
  }

  function walk(root, dictionary) {
    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root, dictionary);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE) {
      if (SKIP_TAGS.has(root.tagName)) return;
      translateAttributes(root, dictionary);
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let node;
    while ((node = walker.nextNode())) {
      translateTextNode(node, dictionary);
    }

    // Attributes on descendants (TreeWalker above only covers text nodes).
    if (root.nodeType === Node.ELEMENT_NODE || root.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      const elements = root.querySelectorAll
        ? root.querySelectorAll("[placeholder],[aria-label],[title]")
        : [];
      for (const el of elements) translateAttributes(el, dictionary);
    }
  }

  function observe(dictionary) {
    let pending = new Set();
    let timer = null;

    const flush = () => {
      const targets = pending;
      pending = new Set();
      timer = null;
      for (const target of targets) {
        if (document.contains(target)) walk(target, dictionary);
      }
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          const parent = mutation.target.parentElement;
          if (parent) pending.add(parent);
        } else if (mutation.type === "childList") {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
              pending.add(node);
            }
          }
        }
      }
      if (pending.size && !timer) {
        timer = setTimeout(flush, DEBOUNCE_MS);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  async function main() {
    const { enabled = true } = await chrome.storage.local.get("enabled");
    if (!enabled) return;

    const dictionary = await loadDictionary();
    walk(document.body, dictionary);
    observe(dictionary);
    setupLiveTooltipEnrichment();
  }

  main().catch((err) => console.error("[TLI 도구 - tliherorank 번역]", err));
})();
