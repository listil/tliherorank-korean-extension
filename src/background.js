// Content scripts run fetch() in the *page's* origin for CORS purposes, so a
// cross-origin request to tlidb.com gets blocked by the browser even with
// host_permissions granted. The background service worker is a privileged
// extension context that isn't subject to the page's CORS policy, so it does
// the actual fetching on the content script's behalf.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "fetchTlidb") return false;

  fetch(`https://tlidb.com/${message.lang}/${message.slug}`)
    .then((res) => (res.ok ? res.text() : null))
    .then((html) => sendResponse({ ok: true, html }))
    .catch((err) => sendResponse({ ok: false, error: String(err) }));

  return true; // keep the message channel open for the async sendResponse
});
