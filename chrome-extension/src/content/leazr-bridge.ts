/**
 * Content script injecté UNIQUEMENT sur leazr.co.
 * Son rôle : relayer les messages de progression envoyés par le background
 * de l'extension vers la page React de Leazr (via window.postMessage).
 *
 * Expose aussi un marqueur `window.__LEAZR_SOURCING_EXTENSION__` pour que
 * la page puisse détecter l'installation de l'extension.
 */

// Marqueur de présence de l'extension + version
const manifestVersion = chrome.runtime.getManifest().version;
const marker = {
  installed: true,
  version: manifestVersion,
  extension_id: chrome.runtime.id,
};

// On injecte un script dans la page pour pouvoir poser une globale
// (chrome.runtime côté content script ≠ chrome.runtime côté page)
const script = document.createElement("script");
script.textContent = `
  window.__LEAZR_SOURCING_EXTENSION__ = ${JSON.stringify(marker)};
  window.dispatchEvent(new CustomEvent('leazr-sourcing-extension-ready', { detail: ${JSON.stringify(marker)} }));
`;
(document.head || document.documentElement).appendChild(script);
script.remove();

// Relay des messages du background vers la page via window.postMessage
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "leazr_sourcing_progress") {
    window.postMessage(
      { __leazr_sourcing: true, ...msg.payload },
      window.location.origin
    );
  }
  return false;
});

console.log("[Leazr Sourcing Bridge] Content script actif sur", window.location.href);
