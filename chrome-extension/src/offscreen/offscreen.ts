/**
 * Offscreen document — exécuté dans un "vrai" contexte HTML invisible.
 *
 * Raison d'être : les Service Workers Manifest V3 n'ont pas accès à
 * DOMParser, window.getComputedStyle, etc. On délègue donc le parsing
 * HTML ici, où le DOM est disponible.
 *
 * Protocole :
 *  - Message: { type: "offscreen_parse_search", html, url, adapter_key, limit }
 *  - Réponse: { offers: CapturedOffer[] } ou { error: string }
 */
import { adapters } from "../content/adapters";

// Signaler au service worker qu'on est prêt (utile pour éviter les race conditions
// au premier appel juste après createDocument)
chrome.runtime.sendMessage({ type: "offscreen_ready" }).catch(() => {
  // Le SW n'est peut-être pas encore réveillé, ce n'est pas grave
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "offscreen_parse_search") return false;

  try {
    const { html, url, adapter_key, limit } = msg as {
      html: string;
      url: string;
      adapter_key: string;
      limit: number;
    };

    const adapter = adapters.find((a) => a.key === adapter_key);
    if (!adapter) {
      sendResponse({ error: `Adapter ${adapter_key} introuvable` });
      return true;
    }
    if (!adapter.extractSearchResults) {
      sendResponse({ error: `Adapter ${adapter_key} ne supporte pas la recherche` });
      return true;
    }

    // DOMParser est disponible ici (contexte window)
    const doc = new DOMParser().parseFromString(html, "text/html");

    if (!doc.body || doc.body.innerHTML.length < 200) {
      sendResponse({ error: "HTML insuffisant (page rendue côté client ?)" });
      return true;
    }

    const offers = adapter.extractSearchResults(doc, new URL(url), limit);
    console.log(`[Offscreen][${adapter_key}] ${offers.length} offres extraites`);
    sendResponse({ offers });
  } catch (e: any) {
    console.error("[Offscreen] Erreur:", e);
    sendResponse({ error: e.message ?? "Erreur parsing" });
  }

  return true; // async response
});

console.log("[Leazr Offscreen] Ready (DOMParser disponible)");
