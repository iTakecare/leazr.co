import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MOLLIE_API_URL = "https://api.mollie.com/v2";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Mollie sends POST with id in body
    const formData = await req.formData();
    const paymentId = formData.get("id") as string;

    if (!paymentId) {
      console.error("[Mollie Webhook] No payment ID received");
      return new Response("OK", { status: 200 });
    }

    console.log(`[Mollie Webhook] Received notification for: ${paymentId}`);

    // Fetch payment details from Mollie
    const apiKey = Deno.env.get("MOLLIE_API_KEY");
    if (!apiKey) {
      console.error("[Mollie Webhook] MOLLIE_API_KEY not configured");
      return new Response("OK", { status: 200 });
    }

    const response = await fetch(`${MOLLIE_API_URL}/payments/${paymentId}`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      console.error(`[Mollie Webhook] Failed to fetch payment: ${response.status}`);
      return new Response("OK", { status: 200 });
    }

    const payment = await response.json();
    console.log(`[Mollie Webhook] Payment status: ${payment.status}`, payment.metadata);

    // Get Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Handle different payment statuses
    const metadata = payment.metadata || {};
    const contractId = metadata.contract_id;
    const companyId = metadata.company_id;

    if (!contractId) {
      console.log("[Mollie Webhook] No contract_id in metadata, skipping");
      return new Response("OK", { status: 200 });
    }

    // Log the payment event
    await supabase.from("mollie_payment_events").insert({
      payment_id: paymentId,
      contract_id: contractId,
      company_id: companyId,
      status: payment.status,
      amount: parseFloat(payment.amount?.value || "0"),
      currency: payment.amount?.currency || "EUR",
      metadata: payment,
      created_at: new Date().toISOString(),
    });

    // Update contract based on status
    switch (payment.status) {
      case "paid":
        console.log(`[Mollie Webhook] Payment successful for contract ${contractId}`);
        // Could update contract payment status, send confirmation email, etc.
        break;
      
      case "failed":
      case "expired":
      case "canceled":
        console.log(`[Mollie Webhook] Payment ${payment.status} for contract ${contractId}`);
        // Could notify admin, update contract status, etc.
        break;

      case "pending":
        console.log(`[Mollie Webhook] Payment pending for contract ${contractId}`);
        break;
    }

    // If this was a mandate creation (first payment), update mandate status
    if (metadata.type === "mandate_creation" && payment.status === "paid") {
      const mandateId = payment.mandateId;
      if (mandateId) {
        console.log(`[Mollie Webhook] Mandate ${mandateId} created for contract ${contractId}`);
        
        // Store mandate info on contract
        await supabase
          .from("contracts")
          .update({ 
            mollie_customer_id: payment.customerId,
            mollie_mandate_id: mandateId,
            mollie_mandate_status: "valid",
          })
          .eq("id", contractId);
      }
    }

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("[Mollie Webhook] Error:", error);
    // Always return 200 to Mollie to prevent retries
    return new Response("OK", { status: 200 });
  }
});
