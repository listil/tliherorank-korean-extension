(async () => {
  const toggle = document.getElementById("enabledToggle");
  const entryCount = document.getElementById("entryCount");

  const { enabled = true } = await chrome.storage.local.get("enabled");
  toggle.checked = enabled;

  toggle.addEventListener("change", () => {
    chrome.storage.local.set({ enabled: toggle.checked });
  });

  const tabButtons = document.querySelectorAll(".tabBtn");
  const tabPanels = document.querySelectorAll(".tabPanel");
  const selectTab = (tab) => {
    for (const btn of tabButtons) btn.setAttribute("aria-selected", String(btn.dataset.tab === tab));
    for (const panel of tabPanels) panel.hidden = panel.dataset.panel !== tab;
  };
  const { lastLinksTab } = await chrome.storage.local.get("lastLinksTab");
  selectTab(lastLinksTab && [...tabButtons].some((b) => b.dataset.tab === lastLinksTab) ? lastLinksTab : "community");
  for (const btn of tabButtons) {
    btn.addEventListener("click", () => {
      selectTab(btn.dataset.tab);
      chrome.storage.local.set({ lastLinksTab: btn.dataset.tab });
    });
  }

  try {
    const [dictionary, uiStrings, heroNames] = await Promise.all([
      fetch(chrome.runtime.getURL("data/dictionary.json")).then((r) => r.json()),
      fetch(chrome.runtime.getURL("data/ui-strings.json")).then((r) => r.json()),
      fetch(chrome.runtime.getURL("data/hero-names.json")).then((r) => r.json()),
    ]);
    const total = Object.keys(dictionary).length + Object.keys(uiStrings).length + Object.keys(heroNames).length;
    entryCount.textContent = total.toLocaleString("ko-KR");
  } catch (err) {
    entryCount.textContent = "?";
    console.error(err);
  }
})();
