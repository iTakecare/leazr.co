import { supabase } from "@/integrations/supabase/client";

/**
 * Types d'événements tracés dans l'historique d'une demande (au-delà des
 * changements de statut). Chaque entrée a un event_type non nul.
 */
export type OfferEventType =
  | "email_offer"
  | "email_doc_request"
  | "email_reminder"
  | "email_other"
  | "pdf_generated"
  | "contract_sent"
  | "esign"
  | "swap"
  | "document";

/**
 * Journalise un événement dans offer_workflow_logs (affiché dans l'onglet
 * Historique). N'échoue jamais l'action appelante : best-effort.
 */
export const logOfferEvent = async (
  offerId: string,
  eventType: OfferEventType,
  label: string,
): Promise<void> => {
  if (!offerId) return;
  try {
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("offer_workflow_logs").insert({
      offer_id: offerId,
      user_id: auth?.user?.id ?? null,
      event_type: eventType,
      reason: label,
    } as any);
  } catch (e) {
    console.warn("[logOfferEvent] échec (non bloquant):", e);
  }
};
