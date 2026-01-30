import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MOLLIE_API_URL = "https://api.mollie.com/v2";

interface MollieSepaRequest {
  action: "create_customer" | "create_mandate" | "create_subscription" | "create_payment" | "get_customer" | "list_mandates";
  customer_id?: string;
  mandate_id?: string;
  // Customer data
  name?: string;
  email?: string;
  // Mandate data (for first payment flow)
  iban?: string;
  bic?: string;
  // Subscription/payment data
  amount?: number;
  currency?: string;
  description?: string;
  interval?: string; // e.g., "1 month"
  times?: number; // Number of payments
  start_date?: string; // YYYY-MM-DD
  // Contract reference
  contract_id?: string;
  company_id?: string;
}

async function mollieRequest(
  endpoint: string,
  method: "GET" | "POST" | "DELETE" = "GET",
  body?: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string; status?: number }> {
  const apiKey = Deno.env.get("MOLLIE_API_KEY");
  if (!apiKey) {
    return { success: false, error: "MOLLIE_API_KEY non configurée" };
  }

  try {
    const options: RequestInit = {
      method,
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    };

    if (body && method === "POST") {
      options.body = JSON.stringify(body);
    }

    console.log(`[Mollie] ${method} ${endpoint}`);
    const response = await fetch(`${MOLLIE_API_URL}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
      console.error(`[Mollie] Error ${response.status}:`, data);
      return { 
        success: false, 
        error: data.detail || data.title || `Erreur Mollie ${response.status}`,
        status: response.status,
        data 
      };
    }

    return { success: true, data, status: response.status };
  } catch (error) {
    console.error("[Mollie] Request failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Erreur réseau" };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user - getUser() uses the Authorization header from the client config
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData?.user) {
      console.error("[Mollie SEPA] Auth error:", userError);
      return new Response(
        JSON.stringify({ success: false, error: "Token invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const userId = userData.user.id;
    console.log("[Mollie SEPA] Authenticated user:", userId);

    const body: MollieSepaRequest = await req.json();
    const { action } = body;

    let result: { success: boolean; data?: unknown; error?: string; status?: number };

    switch (action) {
      case "create_customer": {
        // Create a customer in Mollie
        if (!body.name || !body.email) {
          return new Response(
            JSON.stringify({ success: false, error: "name et email requis" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        result = await mollieRequest("/customers", "POST", {
          name: body.name,
          email: body.email,
          metadata: {
            contract_id: body.contract_id,
            company_id: body.company_id,
          },
        });
        break;
      }

      case "get_customer": {
        if (!body.customer_id) {
          return new Response(
            JSON.stringify({ success: false, error: "customer_id requis" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await mollieRequest(`/customers/${body.customer_id}`);
        break;
      }

      case "create_mandate": {
        // Create a SEPA Direct Debit mandate via first payment
        // Mollie requires a "first payment" to create a mandate
        if (!body.customer_id) {
          return new Response(
            JSON.stringify({ success: false, error: "customer_id requis" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // For SEPA, we create a payment with sequenceType=first
        // The customer will be redirected to their bank to authorize
        const amount = body.amount || 0.01; // Minimum test amount
        result = await mollieRequest("/payments", "POST", {
          amount: {
            currency: body.currency || "EUR",
            value: amount.toFixed(2),
          },
          description: body.description || "Autorisation mandat SEPA",
          redirectUrl: `${req.headers.get("origin") || "https://leazr.lovable.app"}/contracts?mandate_status=success`,
          webhookUrl: `${supabaseUrl}/functions/v1/mollie-webhook`,
          customerId: body.customer_id,
          sequenceType: "first",
          method: "directdebit",
          metadata: {
            type: "mandate_creation",
            contract_id: body.contract_id,
            company_id: body.company_id,
          },
        });
        break;
      }

      case "list_mandates": {
        if (!body.customer_id) {
          return new Response(
            JSON.stringify({ success: false, error: "customer_id requis" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await mollieRequest(`/customers/${body.customer_id}/mandates`);
        break;
      }

      case "create_subscription": {
        // Create a recurring subscription
        if (!body.customer_id || !body.amount) {
          return new Response(
            JSON.stringify({ success: false, error: "customer_id et amount requis" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        result = await mollieRequest(`/customers/${body.customer_id}/subscriptions`, "POST", {
          amount: {
            currency: body.currency || "EUR",
            value: body.amount.toFixed(2),
          },
          interval: body.interval || "1 month",
          description: body.description || "Loyer mensuel",
          startDate: body.start_date,
          times: body.times, // Number of payments (omit for indefinite)
          webhookUrl: `${supabaseUrl}/functions/v1/mollie-webhook`,
          metadata: {
            contract_id: body.contract_id,
            company_id: body.company_id,
          },
        });
        break;
      }

      case "create_payment": {
        // Create a single recurring payment (after mandate exists)
        if (!body.customer_id || !body.amount) {
          return new Response(
            JSON.stringify({ success: false, error: "customer_id et amount requis" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        result = await mollieRequest("/payments", "POST", {
          amount: {
            currency: body.currency || "EUR",
            value: body.amount.toFixed(2),
          },
          description: body.description || "Prélèvement mensuel",
          customerId: body.customer_id,
          mandateId: body.mandate_id, // Optional, Mollie will use valid mandate
          sequenceType: "recurring",
          webhookUrl: `${supabaseUrl}/functions/v1/mollie-webhook`,
          metadata: {
            contract_id: body.contract_id,
            company_id: body.company_id,
          },
        });
        break;
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Action inconnue: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { 
        status: result.success ? 200 : 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("[Mollie SEPA] Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Erreur interne du serveur",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
