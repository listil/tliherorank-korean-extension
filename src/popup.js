(async () => {
  const toggle = document.getElementById("enabledToggle");
  const entryCount = document.getElementById("entryCount");

  const { enabled = true } = await chrome.storage.local.get("enabled");
  toggle.checked = enabled;

  toggle.addEventListener("change", () => {
    chrome.storage.local.set({ enabled: toggle.checked });
  });

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
