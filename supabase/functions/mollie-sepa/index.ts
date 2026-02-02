import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MOLLIE_API_URL = "https://api.mollie.com/v2";

interface MollieSepaRequest {
  action: "create_customer" | "create_mandate" | "create_direct_mandate" | "create_subscription" | "create_payment" | "get_customer" | "list_mandates" | "setup_sepa_complete" | "update_subscription" | "get_subscription" | "list_payments";
  subscription_id?: string;
  new_start_date?: string;
  customer_id?: string;
  mandate_id?: string;
  // Customer data
  name?: string;
  email?: string;
  // Mandate data (for direct IBAN mandate creation)
  consumer_name?: string;
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

    // Verify user using getClaims for JWT validation
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("[Mollie SEPA] Auth error:", claimsError);
      return new Response(
        JSON.stringify({ success: false, error: "Token invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const userId = claimsData.claims.sub;
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
        // Mollie requires a "first payment" with a method that supports recurring
        // The mandate is created automatically after successful first payment
        if (!body.customer_id) {
          return new Response(
            JSON.stringify({ success: false, error: "customer_id requis" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // For recurring payments, we create a first payment WITHOUT specifying directdebit
        // Mollie will show available methods that support recurring (iDEAL, Bancontact, etc.)
        // After successful payment, a mandate is created automatically
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
          // Don't specify method - let Mollie show recurring-compatible methods (iDEAL, Bancontact, etc.)
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

      case "create_direct_mandate": {
        // Create a SEPA Direct Debit mandate directly with IBAN (no checkout redirect)
        // Requires: customer_id, consumer_name (account holder), iban
        if (!body.customer_id) {
          return new Response(
            JSON.stringify({ success: false, error: "customer_id requis" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (!body.consumer_name) {
          return new Response(
            JSON.stringify({ success: false, error: "consumer_name (nom du titulaire) requis" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (!body.iban) {
          return new Response(
            JSON.stringify({ success: false, error: "iban requis" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[Mollie] Creating direct mandate for customer ${body.customer_id} with IBAN ${body.iban.substring(0, 4)}****`);

        const mandatePayload: Record<string, unknown> = {
          method: "directdebit",
          consumerName: body.consumer_name,
          consumerAccount: body.iban.replace(/\s/g, "").toUpperCase(),
        };

        // BIC is optional - Mollie can often derive it from IBAN
        if (body.bic) {
          mandatePayload.consumerBic = body.bic.replace(/\s/g, "").toUpperCase();
        }

        result = await mollieRequest(`/customers/${body.customer_id}/mandates`, "POST", mandatePayload);

        // If mandate created successfully, update the contract in DB
        if (result.success && result.data) {
          const mandate = result.data as { id: string; status: string };
          console.log(`[Mollie] Mandate created: ${mandate.id} with status ${mandate.status}`);
          
          // Update contract with mandate info
          if (body.contract_id) {
            const { error: updateError } = await supabase
              .from("contracts")
              .update({
                mollie_customer_id: body.customer_id,
                mollie_mandate_id: mandate.id,
                mollie_mandate_status: mandate.status,
              })
              .eq("id", body.contract_id);

            if (updateError) {
              console.error("[Mollie] Failed to update contract:", updateError);
            } else {
              console.log(`[Mollie] Contract ${body.contract_id} updated with mandate ${mandate.id}`);
            }
          }
        }
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

      case "setup_sepa_complete": {
        // Complete SEPA setup: create customer + mandate + subscription in one call
        if (!body.name || !body.email) {
          return new Response(
            JSON.stringify({ success: false, error: "name et email requis" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (!body.consumer_name || !body.iban) {
          return new Response(
            JSON.stringify({ success: false, error: "consumer_name et iban requis" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (!body.amount || body.amount <= 0) {
          return new Response(
            JSON.stringify({ success: false, error: "amount doit être positif" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[Mollie] Starting complete SEPA setup for ${body.name}`);

        // Step 1: Create customer
        const customerResult = await mollieRequest("/customers", "POST", {
          name: body.name,
          email: body.email,
          metadata: {
            contract_id: body.contract_id,
            company_id: body.company_id,
          },
        });

        if (!customerResult.success || !customerResult.data) {
          console.error("[Mollie] Customer creation failed:", customerResult.error);
          result = { success: false, error: customerResult.error || "Erreur création client" };
          break;
        }

        const customer = customerResult.data as { id: string };
        console.log(`[Mollie] Customer created: ${customer.id}`);

        // Step 2: Create direct mandate with IBAN
        const mandatePayload: Record<string, unknown> = {
          method: "directdebit",
          consumerName: body.consumer_name,
          consumerAccount: body.iban.replace(/\s/g, "").toUpperCase(),
        };
        if (body.bic) {
          mandatePayload.consumerBic = body.bic.replace(/\s/g, "").toUpperCase();
        }

        const mandateResult = await mollieRequest(`/customers/${customer.id}/mandates`, "POST", mandatePayload);

        if (!mandateResult.success || !mandateResult.data) {
          console.error("[Mollie] Mandate creation failed:", mandateResult.error);
          result = { success: false, error: mandateResult.error || "Erreur création mandat" };
          break;
        }

        const mandate = mandateResult.data as { id: string; status: string };
        console.log(`[Mollie] Mandate created: ${mandate.id} with status ${mandate.status}`);

        // Step 3: Create subscription (only if mandate is valid or pending)
        let subscription: { id: string; status: string; nextPaymentDate?: string } | null = null;
        let subscriptionError: string | null = null;

        if (mandate.status === "valid" || mandate.status === "pending") {
          // Fetch payment_day from company_customizations
          let paymentDay = 1;
          if (body.company_id) {
            const { data: companySettings } = await supabase
              .from("company_customizations")
              .select("payment_day")
              .eq("company_id", body.company_id)
              .single();
            if (companySettings?.payment_day) {
              paymentDay = companySettings.payment_day;
            }
            console.log(`[Mollie] Using payment day: ${paymentDay}`);
          }

          // Calculate start date: paymentDay of next month
          const startDate = body.start_date || (() => {
            const now = new Date();
            const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, paymentDay);
            return nextMonth.toISOString().split("T")[0]; // YYYY-MM-DD
          })();

          const subscriptionResult = await mollieRequest(`/customers/${customer.id}/subscriptions`, "POST", {
            amount: {
              currency: body.currency || "EUR",
              value: body.amount.toFixed(2),
            },
            interval: body.interval || "1 month",
            description: body.description || "Loyer mensuel",
            startDate: startDate,
            times: body.times, // Number of payments
            webhookUrl: `${supabaseUrl}/functions/v1/mollie-webhook`,
            metadata: {
              contract_id: body.contract_id,
              company_id: body.company_id,
            },
          });

          if (subscriptionResult.success && subscriptionResult.data) {
            subscription = subscriptionResult.data as { id: string; status: string; nextPaymentDate?: string };
            console.log(`[Mollie] Subscription created: ${subscription.id}`);
          } else {
            subscriptionError = subscriptionResult.error || "Erreur création abonnement";
            console.error("[Mollie] Subscription creation failed:", subscriptionError);
          }
        } else {
          subscriptionError = `Mandat non valide (${mandate.status}), abonnement non créé`;
          console.warn(`[Mollie] ${subscriptionError}`);
        }

        // Step 4: Update contract with all IDs
        if (body.contract_id) {
          const updateData: Record<string, unknown> = {
            mollie_customer_id: customer.id,
            mollie_mandate_id: mandate.id,
            mollie_mandate_status: mandate.status,
          };
          if (subscription) {
            updateData.mollie_subscription_id = subscription.id;
          }

          const { error: updateError } = await supabase
            .from("contracts")
            .update(updateData)
            .eq("id", body.contract_id);

          if (updateError) {
            console.error("[Mollie] Failed to update contract:", updateError);
          } else {
            console.log(`[Mollie] Contract ${body.contract_id} updated with all Mollie IDs`);
          }
        }

        // Build response data
        result = {
          success: true,
          data: {
            customer_id: customer.id,
            mandate_id: mandate.id,
            mandate_status: mandate.status,
            subscription_id: subscription?.id || null,
            subscription_status: subscription?.status || null,
            first_payment_date: subscription?.nextPaymentDate || null,
            subscription_error: subscriptionError,
          },
        };
        break;
      }

      case "get_subscription": {
        // Get subscription details from Mollie
        if (!body.customer_id || !body.subscription_id) {
          return new Response(
            JSON.stringify({ success: false, error: "customer_id et subscription_id requis" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[Mollie] Getting subscription ${body.subscription_id} for customer ${body.customer_id}`);
        result = await mollieRequest(`/customers/${body.customer_id}/subscriptions/${body.subscription_id}`);
        break;
      }

      case "list_payments": {
        // Get payment history for a customer
        if (!body.customer_id) {
          return new Response(
            JSON.stringify({ success: false, error: "customer_id requis" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const limit = (body as { limit?: number }).limit || 10;
        console.log(`[Mollie] Getting payments for customer ${body.customer_id} (limit: ${limit})`);
        result = await mollieRequest(`/customers/${body.customer_id}/payments?limit=${limit}`);
        break;
      }

      case "update_subscription": {
        // Update subscription billing day by canceling and recreating
        // Mollie doesn't support direct subscription date updates, so we need to:
        // 1. Get current subscription details
        // 2. Cancel it
        // 3. Create a new one with the new start date
        
        if (!body.customer_id || !body.subscription_id) {
          return new Response(
            JSON.stringify({ success: false, error: "customer_id et subscription_id requis" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        console.log(`[Mollie] Updating subscription ${body.subscription_id} for customer ${body.customer_id}`);
        
        // Get current subscription details
        const getResult = await mollieRequest(`/customers/${body.customer_id}/subscriptions/${body.subscription_id}`);
        
        if (!getResult.success || !getResult.data) {
          console.error("[Mollie] Failed to get subscription:", getResult.error);
          result = { success: false, error: getResult.error || "Abonnement non trouvé" };
          break;
        }
        
        const currentSub = getResult.data as { 
          amount: { value: string; currency: string };
          interval: string;
          description: string;
          times?: number;
          metadata?: Record<string, unknown>;
          nextPaymentDate?: string;
        };
        
        console.log(`[Mollie] Current subscription:`, currentSub);
        
        // Cancel current subscription
        const cancelResult = await mollieRequest(
          `/customers/${body.customer_id}/subscriptions/${body.subscription_id}`,
          "DELETE"
        );
        
        if (!cancelResult.success && cancelResult.status !== 200) {
          console.error("[Mollie] Failed to cancel subscription:", cancelResult.error);
          result = { success: false, error: cancelResult.error || "Impossible d'annuler l'abonnement" };
          break;
        }
        
        console.log(`[Mollie] Subscription cancelled, creating new one`);
        
        // Get payment day from company settings or use provided date
        let newStartDate = body.new_start_date;
        
        if (!newStartDate && body.company_id) {
          const { data: companySettings } = await supabase
            .from("company_customizations")
            .select("payment_day")
            .eq("company_id", body.company_id)
            .single();
          
          const paymentDay = companySettings?.payment_day || 1;
          const now = new Date();
          const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, paymentDay);
          newStartDate = nextMonth.toISOString().split("T")[0];
          console.log(`[Mollie] Using payment day ${paymentDay}, new start date: ${newStartDate}`);
        }
        
        // Create new subscription with updated billing date
        const newSubResult = await mollieRequest(`/customers/${body.customer_id}/subscriptions`, "POST", {
          amount: currentSub.amount,
          interval: currentSub.interval,
          description: currentSub.description,
          startDate: newStartDate,
          times: body.times || currentSub.times,
          webhookUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mollie-webhook`,
          metadata: currentSub.metadata || {
            contract_id: body.contract_id,
            company_id: body.company_id,
          },
        });
        
        if (!newSubResult.success || !newSubResult.data) {
          console.error("[Mollie] Failed to create new subscription:", newSubResult.error);
          result = { success: false, error: newSubResult.error || "Impossible de créer le nouvel abonnement" };
          break;
        }
        
        const newSub = newSubResult.data as { id: string; status: string; nextPaymentDate?: string };
        console.log(`[Mollie] New subscription created: ${newSub.id}`);
        
        // Update contract with new subscription ID
        if (body.contract_id) {
          const { error: updateError } = await supabase
            .from("contracts")
            .update({ mollie_subscription_id: newSub.id })
            .eq("id", body.contract_id);
          
          if (updateError) {
            console.error("[Mollie] Failed to update contract:", updateError);
          } else {
            console.log(`[Mollie] Contract ${body.contract_id} updated with new subscription ID`);
          }
        }
        
        result = {
          success: true,
          data: {
            old_subscription_id: body.subscription_id,
            new_subscription_id: newSub.id,
            new_subscription_status: newSub.status,
            new_start_date: newStartDate,
            next_payment_date: newSub.nextPaymentDate,
          },
        };
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
