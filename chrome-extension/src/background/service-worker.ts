/**
 * Background service worker.
 * Rôle : recevoir les messages du content script + popup,
 *        appeler les edge functions Leazr.
 */
import { callFunction, getSupabase } from "../lib/supabase";
import type { CapturedOffer, SourcingContext, ExtensionMessage } from "../lib/types";

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Leazr Sourcing] Extension installée");
});

chrome.runtime.onMessage.addListener((msg: ExtensionMessage & { offer?: CapturedOffer; context?: SourcingContext }, _sender, sendResponse) => {
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
      console.error("[Leazr Sourcing] Erreur background:", e);
      sendResponse({ success: false, error: e.message ?? "Erreur interne" });
    }
  })();
  return true; // async response
});

async function submitOffer(offer: CapturedOffer, context: SourcingContext) {
  // Vérifier la session
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

  // Notification système pour confirmation
  chrome.notifications?.create({
    type: "basic",
    iconUrl: "icons/icon-48.png",
    title: "Offre ajoutée à Leazr",
    message: result.needs_validation
      ? `Proposée · en attente de validation par un admin`
      : `Ajoutée avec succès à la commande`,
  });

  return result;
}
