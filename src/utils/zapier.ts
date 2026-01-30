import { supabase } from "@/integrations/supabase/client";

interface ZapierPayload {
  event_type: string;
  timestamp: string;
  company_id: string;
  data: Record<string, unknown>;
}

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
