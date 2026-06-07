/**
 * mollie-saas-subscribe
 *
 * Souscrit l'ENTREPRISE de l'appelant à un plan SaaS Leazr (facturation A :
 * Leazr → entreprise cliente), via Mollie SEPA Direct Debit récurrent.
 *
 * Flux Mollie : customer → mandat SEPA (IBAN) → subscription mensuelle.
 * À la fin : companies.{mollie_customer_id, mollie_mandate_id,
 * mollie_subscription_id, plan, account_status='active'} sont mis à jour.
 *
 * SÉCURITÉ : la company n'est JAMAIS prise dans le body — elle est dérivée du
 * profil de l'appelant authentifié, qui doit être admin/super_admin.
 *
 * À TESTER EN SANDBOX MOLLIE avant prod (nécessite MOLLIE_API_KEY).
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MOLLIE_API_URL = "https://api.mollie.com/v2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Grille tarifaire — DOIT rester alignée avec src/config/saasPlans.ts.
const PLAN_PRICE_CENTS: Record<string, number> = {
  starter: 7900,
  pro: 12900,
  business: 19900,
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function mollie(path: string, apiKey: string, method = "GET", body?: Record<string, unknown>) {
  const res = await fetch(`${MOLLIE_API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Mollie ${method} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const apiKey = Deno.env.get("MOLLIE_API_KEY");
    if (!apiKey) return json(500, { error: "MOLLIE_API_KEY non configurée" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // ── Auth : identifier l'appelant et sa company (jamais depuis le body) ──
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json(401, { error: "Non authentifié" });

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user } } = await callerClient.auth.getUser(token);
    if (!user) return json(401, { error: "Non authentifié" });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin
      .from("profiles")
      .select("company_id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.company_id) return json(403, { error: "Aucune entreprise associée" });
    if (!["admin", "super_admin"].includes(profile.role)) {
      return json(403, { error: "Réservé aux administrateurs" });
    }
    const companyId: string = profile.company_id;

    // ── Body ──
    const { plan, iban, accountHolder, bic } = await req.json();
    const planId = String(plan || "").toLowerCase();

    // Prix depuis la table éditable saas_plans (source de vérité, modifiable
    // par le super_admin). Repli sur la constante si la ligne est absente.
    let priceCents: number | undefined;
    const { data: planRow } = await admin
      .from("saas_plans")
      .select("price_cents, is_active")
      .eq("plan_id", planId)
      .maybeSingle();
    if (planRow && planRow.is_active !== false) {
      priceCents = planRow.price_cents as number;
    } else {
      priceCents = PLAN_PRICE_CENTS[planId];
    }
    if (!priceCents) return json(400, { error: "Plan invalide" });
    if (!iban || !accountHolder) {
      return json(400, { error: "iban et accountHolder sont requis" });
    }

    // ── Company actuelle ──
    const { data: company } = await admin
      .from("companies")
      .select("id, name, mollie_customer_id")
      .eq("id", companyId)
      .single();
    if (!company) return json(404, { error: "Entreprise introuvable" });

    const email = user.email ?? `billing+${companyId}@leazr.co`;

    // 1) Customer Mollie (réutilise l'existant si déjà créé)
    let customerId = company.mollie_customer_id as string | null;
    if (!customerId) {
      const customer = await mollie("/customers", apiKey, "POST", {
        name: company.name || accountHolder,
        email,
        metadata: { company_id: companyId, kind: "saas_subscription" },
      });
      customerId = customer.id;
    }

    // 2) Mandat SEPA direct (IBAN) — pas de redirection
    const mandate = await mollie(`/customers/${customerId}/mandates`, apiKey, "POST", {
      method: "directdebit",
      consumerName: accountHolder,
      consumerAccount: iban.replace(/\s+/g, ""),
      ...(bic ? { consumerBic: bic } : {}),
    });

    // 3) Subscription mensuelle au tarif du plan
    const value = (priceCents / 100).toFixed(2);
    const webhookUrl = `${supabaseUrl}/functions/v1/mollie-webhook`;
    const subscription = await mollie(`/customers/${customerId}/subscriptions`, apiKey, "POST", {
      amount: { currency: "EUR", value },
      interval: "1 month",
      description: `Abonnement Leazr ${planId} — ${company.name ?? companyId}`,
      mandateId: mandate.id,
      webhookUrl,
      metadata: { company_id: companyId, kind: "saas_subscription", plan: planId },
    });

    // 4) Persister sur la company → tenant activé
    const { error: updateErr } = await admin
      .from("companies")
      .update({
        mollie_customer_id: customerId,
        mollie_mandate_id: mandate.id,
        mollie_subscription_id: subscription.id,
        plan: planId,
        account_status: "active",
        subscription_started_at: new Date().toISOString(),
      })
      .eq("id", companyId);
    if (updateErr) throw new Error(`MAJ company échouée: ${updateErr.message}`);

    return json(200, {
      success: true,
      plan: planId,
      mollie_customer_id: customerId,
      mollie_mandate_id: mandate.id,
      mollie_subscription_id: subscription.id,
      mandate_status: mandate.status,
    });
  } catch (e) {
    console.error("[mollie-saas-subscribe]", e);
    return json(500, { success: false, error: e instanceof Error ? e.message : "Erreur interne" });
  }
});
