/**
 * Background service worker.
 * Deux canaux de communication :
 *  - chrome.runtime.onMessage         → content scripts & popup (même extension)
 *  - chrome.runtime.onMessageExternal → page Leazr (via externally_connectable)
 *
 * Rôles :
 *  1. Proxy offres capturées vers l'edge function sourcing-ingest-offer
 *  2. Orchestration de la recherche multi-source à la demande de Leazr
 *  3. Handshake de présence
 */
import { callFunction, getSupabase } from "../lib/supabase";
import { runMultiSourceSearch } from "./orchestrator";
import type {
  CapturedOffer,
  SourcingContext,
  ExtensionMessage,
  SearchRequest,
  SearchProgressMessage,
} from "../lib/types";

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Leazr Sourcing] Extension installée");
});

// ═══════════════════════════════════════════════════════════
// Messages internes (content script + popup)
// ═══════════════════════════════════════════════════════════
chrome.runtime.onMessage.addListener(
  (msg: ExtensionMessage & { offer?: CapturedOffer; context?: SourcingContext }, _sender, sendResponse) => {
    (async () => {
      try {
        switch (msg.type) {
          case "ping":
            sendResponse({ success: true, pong: true });
            return;

          case "submit_offer":
            if (!msg.offer || !msg.context) throw new Error("Offer et context requis");
            sendResponse(await submitOffer(msg.offer, msg.context));
            return;

          default:
            sendResponse({ success: false, error: `Message inconnu: ${(msg as any).type}` });
        }
      } catch (e: any) {
        console.error("[Leazr Sourcing] Erreur internal:", e);
        sendResponse({ success: false, error: e.message ?? "Erreur interne" });
      }
    })();
    return true;
  }
);

// ═══════════════════════════════════════════════════════════
// Messages externes (depuis la page Leazr via externally_connectable)
// ═══════════════════════════════════════════════════════════
chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  console.log("[Leazr Sourcing] Message externe reçu:", msg.type, "depuis", sender.url);

  (async () => {
    try {
      switch (msg.type) {
        case "handshake":
        case "ping":
          sendResponse({
            success: true,
            installed: true,
            version: chrome.runtime.getManifest().version,
          });
          return;

        case "multi_source_search":
          sendResponse(await handleSearch(msg as SearchRequest, sender.tab?.id));
          return;

        default:
          sendResponse({ success: false, error: `Message inconnu: ${(msg as any).type}` });
      }
    } catch (e: any) {
      console.error("[Leazr Sourcing] Erreur external:", e);
      sendResponse({ success: false, error: e.message ?? "Erreur interne" });
    }
  })();
  return true; // async sendResponse
});

/**
 * Recherche multi-source. On renvoie les progressions via chrome.tabs.sendMessage
 * sur la tab qui a initié la requête (si fourni).
 */
async function handleSearch(req: SearchRequest, initiatorTabId?: number) {
  const onProgress = (progressMsg: SearchProgressMessage) => {
    if (initiatorTabId !== undefined) {
      chrome.tabs
        .sendMessage(initiatorTabId, {
          type: "leazr_sourcing_progress",
          payload: progressMsg,
        })
        .catch(() => {
          // La tab peut ne pas avoir de content script Leazr, on ignore
        });
    }
  };
  return await runMultiSourceSearch(req, onProgress);
}

/** Envoie une offre capturée à l'edge function sourcing-ingest-offer */
async function submitOffer(offer: CapturedOffer, context: SourcingContext) {
  const supa = getSupabase();
  const { data: { session } } = await supa.auth.getSession();
  if (!session) throw new Error("Non connecté à Leazr — ouvre la popup pour te connecter");

  const target =
    context.type === "equipment_order_unit"
      ? { equipment_order_unit_id: context.target_id }
      : context.type === "contract_equipment"
      ? { contract_equipment_id: context.target_id }
      : { offer_equipment_id: context.target_id };

  const result = await callFunction<{
    success: boolean;
    id: string;
    status: string;
    needs_validation: boolean;
    supplier_matched: boolean;
    error?: string;
  }>("sourcing-ingest-offer", {
    target,
    supplier_hint: { host: offer.captured_host },
    offer,
    source_channel: "extension",
  });

  if (!result?.success) throw new Error(result?.error ?? "Erreur ingestion");

  chrome.notifications?.create({
    type: "basic",
    iconUrl: "icons/icon-48.png",
    title: "Offre ajoutée à Leazr",
    message: result.needs_validation
      ? "Proposée · en attente de validation par un admin"
      : "Ajoutée avec succès à la commande",
  });

  return result;
}
