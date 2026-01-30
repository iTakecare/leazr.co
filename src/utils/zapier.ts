import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

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
 * Test a Zapier webhook URL via the Edge Function proxy
 * Returns actual confirmation from Zapier (not just "request sent")
 */
export async function testZapierWebhook(
  webhookUrl: string,
  testPayload?: Record<string, unknown>
): Promise<{ success: boolean; message: string; status?: number }> {
  try {
    const payload = testPayload || {
      event_type: "test",
      timestamp: new Date().toISOString(),
      triggered_from: typeof window !== "undefined" ? window.location.origin : "server",
      data: {
        message: "Test de connexion Zapier depuis Leazr",
        test: true,
      },
    };

    const { data, error } = await supabase.functions.invoke("zapier-proxy", {
      body: {
        action: "test",
        webhook_url: webhookUrl,
        payload,
      },
    });

    if (error) {
      console.error("[Zapier] Edge function error:", error);
      return { 
        success: false, 
        message: error.message || "Erreur de connexion au serveur" 
      };
    }

    return {
      success: data?.success === true,
      message: data?.message || data?.error || "Réponse inattendue",
      status: data?.status,
    };
  } catch (error) {
    console.error("[Zapier] Test error:", error);
    return { 
      success: false, 
      message: "Erreur inattendue lors du test" 
    };
  }
}

/**
 * Triggers a Zapier webhook for a specific event type via Edge Function proxy
 * Only triggers if the company has Zapier configured and the event is enabled
 */
export async function triggerZapierWebhook(
  companyId: string,
  eventType: string,
  data: Record<string, unknown>
): Promise<boolean> {
  try {
    const { data: result, error } = await supabase.functions.invoke("zapier-proxy", {
      body: {
        action: "trigger",
        company_id: companyId,
        event_type: eventType,
        payload: data,
      },
    });

    if (error) {
      console.error("[Zapier] Error triggering webhook:", error);
      return false;
    }

    if (!result?.success) {
      console.log("[Zapier] Webhook not triggered:", result?.error);
      return false;
    }

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

    // Send the SEPA-specific payload format via proxy
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

    const success = await triggerZapierWebhook(companyId, "sepa_payment_created", sepaPayload);
    
    if (!success) {
      return { success: false, error: "Échec de l'envoi vers Zapier" };
    }

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
