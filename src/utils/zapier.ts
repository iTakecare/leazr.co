import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

interface ZapierPayload {
  event_type: string;
  timestamp: string;
  company_id: string;
  data: Record<string, unknown>;
}

// Schema de validation pour les paiements SEPA GoCardless
const sepaPaymentSchema = z.object({
  nom: z.string().trim().min(1, "Le nom est requis").max(100, "Le nom est trop long"),
  prenom: z.string().trim().min(1, "Le prénom est requis").max(100, "Le prénom est trop long"),
  email: z.string().trim().email("Email invalide").max(255, "Email trop long"),
  iban: z.string().trim().min(15, "IBAN invalide").max(34, "IBAN trop long")
    .regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/i, "Format IBAN invalide"),
  devise: z.string().trim().length(3, "Devise invalide (ex: EUR)").default("EUR"),
  montant: z.number().positive("Le montant doit être positif").max(100000, "Montant trop élevé"),
  nombre_mois: z.number().int().positive("Le nombre de mois doit être positif").max(120, "Durée trop longue"),
  frais_dossiers: z.number().min(0, "Les frais ne peuvent pas être négatifs").max(75, "Les frais sont limités à 75€"),
  assurance_materiel: z.number().min(0, "L'assurance ne peut pas être négative").max(10000, "Montant assurance trop élevé"),
});

export type SepaPaymentData = z.infer<typeof sepaPaymentSchema>;

/**
 * Triggers a Zapier webhook for a specific event type
 * Only triggers if the company has Zapier configured and the event is enabled
 */
export async function triggerZapierWebhook(
  companyId: string,
  eventType: string,
  data: Record<string, unknown>
): Promise<boolean> {
  try {
    // Fetch the Zapier config for this company
    const { data: zapierConfig, error } = await supabase
      .from("zapier_integrations")
      .select("webhook_url, enabled_events, is_active")
      .eq("company_id", companyId)
      .maybeSingle();

    if (error) {
      console.error("[Zapier] Error fetching config:", error);
      return false;
    }

    // Check if Zapier is configured and active
    if (!zapierConfig || !zapierConfig.is_active || !zapierConfig.webhook_url) {
      console.log("[Zapier] Not configured or inactive for company:", companyId);
      return false;
    }

    // Check if this event type is enabled
    const enabledEvents = zapierConfig.enabled_events as string[];
    if (!enabledEvents.includes(eventType)) {
      console.log("[Zapier] Event type not enabled:", eventType);
      return false;
    }

    // Prepare the payload
    const payload: ZapierPayload = {
      event_type: eventType,
      timestamp: new Date().toISOString(),
      company_id: companyId,
      data,
    };

    // Send to Zapier webhook (no-cors mode since Zapier doesn't return proper CORS headers)
    await fetch(zapierConfig.webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      mode: "no-cors",
      body: JSON.stringify(payload),
    });

    // Update last_triggered_at
    await supabase
      .from("zapier_integrations")
      .update({ last_triggered_at: new Date().toISOString() })
      .eq("company_id", companyId);

    console.log("[Zapier] Webhook triggered successfully for event:", eventType);
    return true;
  } catch (error) {
    console.error("[Zapier] Error triggering webhook:", error);
    return false;
  }
}

/**
 * Trigger Zapier to create a SEPA payment via GoCardless
 * Uses the specific payload format required by the GoCardless Zap
 */
export async function triggerSepaPayment(
  companyId: string,
  paymentData: SepaPaymentData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate input data
    const validationResult = sepaPaymentSchema.safeParse(paymentData);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message).join(", ");
      console.error("[Zapier SEPA] Validation failed:", errors);
      return { success: false, error: errors };
    }

    const validatedData = validationResult.data;

    // Fetch the Zapier config for this company
    const { data: zapierConfig, error } = await supabase
      .from("zapier_integrations")
      .select("webhook_url, enabled_events, is_active")
      .eq("company_id", companyId)
      .maybeSingle();

    if (error) {
      console.error("[Zapier SEPA] Error fetching config:", error);
      return { success: false, error: "Erreur de configuration Zapier" };
    }

    if (!zapierConfig || !zapierConfig.is_active || !zapierConfig.webhook_url) {
      return { success: false, error: "Zapier n'est pas configuré pour cette entreprise" };
    }

    const enabledEvents = zapierConfig.enabled_events as string[];
    if (!enabledEvents.includes("sepa_payment_created")) {
      return { success: false, error: "L'événement SEPA n'est pas activé dans Zapier" };
    }

    // Send the SEPA-specific payload format
    const sepaPayload = {
      nom: validatedData.nom,
      prenom: validatedData.prenom,
      email: validatedData.email,
      iban: validatedData.iban.toUpperCase().replace(/\s/g, ""),
      devise: validatedData.devise.toUpperCase(),
      montant: validatedData.montant,
      nombre_mois: validatedData.nombre_mois,
      frais_dossiers: validatedData.frais_dossiers,
      assurance_materiel: validatedData.assurance_materiel,
    };

    await fetch(zapierConfig.webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      mode: "no-cors",
      body: JSON.stringify(sepaPayload),
    });

    // Update last_triggered_at
    await supabase
      .from("zapier_integrations")
      .update({ last_triggered_at: new Date().toISOString() })
      .eq("company_id", companyId);

    console.log("[Zapier SEPA] Payment request sent successfully");
    return { success: true };
  } catch (error) {
    console.error("[Zapier SEPA] Error:", error);
    return { success: false, error: "Erreur lors de l'envoi vers Zapier" };
  }
}

/**
 * Trigger Zapier when a contract is signed
 */
export async function triggerContractSigned(
  companyId: string,
  contractData: {
    contract_id: string;
    client_name: string;
    monthly_payment: number;
    contract_start_date: string | null;
  }
): Promise<boolean> {
  return triggerZapierWebhook(companyId, "contract_signed", contractData);
}

/**
 * Trigger Zapier when a client is created
 */
export async function triggerClientCreated(
  companyId: string,
  clientData: {
    client_id: string;
    client_name: string;
    email: string | null;
    company: string | null;
  }
): Promise<boolean> {
  return triggerZapierWebhook(companyId, "client_created", clientData);
}

/**
 * Trigger Zapier when an offer is accepted
 */
export async function triggerOfferAccepted(
  companyId: string,
  offerData: {
    offer_id: string;
    client_name: string;
    total_amount: number;
    monthly_payment: number;
  }
): Promise<boolean> {
  return triggerZapierWebhook(companyId, "offer_accepted", offerData);
}

/**
 * Trigger Zapier when an offer is sent
 */
export async function triggerOfferSent(
  companyId: string,
  offerData: {
    offer_id: string;
    client_name: string;
    client_email: string | null;
    total_amount: number;
  }
): Promise<boolean> {
  return triggerZapierWebhook(companyId, "offer_sent", offerData);
}

/**
 * Trigger Zapier when a document is uploaded
 */
export async function triggerDocumentUploaded(
  companyId: string,
  documentData: {
    document_id: string;
    document_type: string;
    file_name: string;
    related_entity_type: string;
    related_entity_id: string;
  }
): Promise<boolean> {
  return triggerZapierWebhook(companyId, "document_uploaded", documentData);
}
