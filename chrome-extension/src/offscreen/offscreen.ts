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
import { enrichCoolbluePriceFromDetail } from "../content/adapters/coolblue";

// Signaler au service worker qu'on est prêt (utile pour éviter les race conditions
// au premier appel juste après createDocument)
chrome.runtime.sendMessage({ type: "offscreen_ready" }).catch(() => {});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  // ═══ Extraction des résultats de recherche ═══
  if (msg?.type === "offscreen_parse_search") {
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
      const doc = new DOMParser().parseFromString(html, "text/html");
      if (!doc.body || doc.body.innerHTML.length < 200) {
        sendResponse({ error: "HTML insuffisant (page rendue côté client ?)" });
        return true;
      }
      const offers = adapter.extractSearchResults(doc, new URL(url), limit);
      console.log(`[Offscreen][${adapter_key}] ${offers.length} offres extraites`);
      sendResponse({ offers });
    } catch (e: any) {
      console.error("[Offscreen] Erreur parse:", e);
      sendResponse({ error: e.message ?? "Erreur parsing" });
    }
    return true;
  }

  // ═══ Enrichissement d'une offre Coolblue refurb (prix depuis page détail) ═══
  if (msg?.type === "offscreen_enrich_coolblue_price") {
    try {
      const { html } = msg as { html: string };
      const result = enrichCoolbluePriceFromDetail(html);
      sendResponse(result);
    } catch (e: any) {
      console.error("[Offscreen] Erreur enrich:", e);
      sendResponse({ price_cents: null, error: e.message });
    }
    return true;
  }

  return false;
});

console.log("[Leazr Offscreen] Ready (DOMParser disponible)");
