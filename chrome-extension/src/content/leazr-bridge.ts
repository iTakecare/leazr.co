/**
 * Content script injecté UNIQUEMENT sur leazr.co.
 *
 * Communique avec la page React via CustomEvent (fonctionne à travers
 * les isolated worlds Chrome — pas besoin d'injecter un script inline
 * qui pourrait être bloqué par CSP).
 *
 * Rôle :
 *  1. Annonce la présence de l'extension (au démarrage + sur demande)
 *  2. Relaie les messages de progression du background vers la page
 */

const manifestVersion = chrome.runtime.getManifest().version;
const marker = {
  installed: true,
  version: manifestVersion,
  extension_id: chrome.runtime.id,
};

/** Envoie un CustomEvent "leazr-sourcing-extension-ready" à la page */
function announce() {
  try {
    window.dispatchEvent(
      new CustomEvent("leazr-sourcing-extension-ready", { detail: marker })
    );
  } catch (e) {
    console.warn("[Leazr Sourcing Bridge] dispatch failed:", e);
  }
}

// Announce immédiatement (run_at: document_start)
announce();

// Re-announce après le DOMContentLoaded et window.load (la page React peut
// écouter tardivement)
document.addEventListener("DOMContentLoaded", announce, { once: true });
window.addEventListener("load", announce, { once: true });

// Et répéter quelques fois pour couvrir le cas où React hydrate très tard
let attempts = 0;
const heartbeat = setInterval(() => {
  announce();
  if (++attempts >= 20) clearInterval(heartbeat); // 20 × 500ms = 10s
}, 500);

// Répondre aux demandes explicites de la page (détection à la demande)
window.addEventListener("leazr-sourcing-detect", () => {
  announce();
});

// Relay des messages de progression (background SW → page React)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "leazr_sourcing_progress") {
    try {
      window.dispatchEvent(
        new CustomEvent("leazr-sourcing-progress", { detail: msg.payload })
      );
    } catch (e) {
      console.warn("[Leazr Sourcing Bridge] relay failed:", e);
    }
  }
  return false;
});

console.log("[Leazr Sourcing Bridge] Content script actif · ext_id:", chrome.runtime.id);
