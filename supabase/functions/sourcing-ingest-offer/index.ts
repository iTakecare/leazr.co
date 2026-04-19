/**
 * sourcing-ingest-offer
 *
 * Reçoit une offre produit capturée :
 *  • par l'extension Chrome (sur un site fournisseur)
 *  • par collage manuel d'URL dans la page Optimiseur
 *  • par un adapter serveur (recherche temps réel)
 *
 * Crée un enregistrement dans `order_line_sourcing` avec le bon workflow :
 *  • admin / sales_manager  → status 'approved' directement
 *  • employee              → status 'proposed' (en attente de validation)
 *
 * Body:
 * {
 *   target: {
 *     equipment_order_unit_id?: string,
 *     contract_equipment_id?: string,
 *     offer_equipment_id?: string,
 *   },
 *   supplier_hint?: {
 *     // Si un fournisseur connu, on donne son id (extension qui a mappé le host)
 *     supplier_id?: string,
 *     // Sinon : nom + URL, on essaiera de matcher ou créer
 *     name?: string,
 *     host?: string,
 *   },
 *   offer: {
 *     title: string,
 *     price_cents: number,
 *     delivery_cost_cents?: number,
 *     delivery_days_min?: number,
 *     delivery_days_max?: number,
 *     condition?: string,       // 'new' | 'grade_a' | 'grade_b' | 'grade_c'
 *     warranty_months?: number,
 *     url: string,
 *     image_url?: string,
 *     stock_status?: string,    // 'in_stock' | 'limited' | 'out_of_stock'
 *     currency?: string,        // 'EUR' par défaut
 *     raw_specs?: object,
 *   },
 *   source_channel: 'extension' | 'manual_url' | 'search' | 'api_b2b',
 *   sourcing_search_id?: string,
 *   rank?: number,
 *   notes?: string,
 * }
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
function fail(msg: string, status = 400) {
  return ok({ success: false, error: msg }, status);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── Auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return fail("Non authentifié", 401);

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return fail("Non authentifié", 401);

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // ── Récupérer profil (rôle + company) ──
    const { data: profile } = await admin
      .from("profiles")
      .select("id, role, company_id")
      .eq("id", user.id)
      .single();

    if (!profile) return fail("Profil introuvable", 403);
    const { role, company_id } = profile as { role: string; company_id: string };

    // ── Parse body ──
    const body = await req.json();
    const { target, supplier_hint, offer, source_channel = "manual_url", sourcing_search_id, rank, notes } = body;

    if (!offer?.title || typeof offer?.price_cents !== "number") {
      return fail("title et price_cents sont requis");
    }
    if (!offer?.url) return fail("url de l'offre requise");
    if (!target || (!target.equipment_order_unit_id && !target.contract_equipment_id && !target.offer_equipment_id)) {
      return fail("target requis : equipment_order_unit_id, contract_equipment_id ou offer_equipment_id");
    }

    // ── Résoudre le supplier_id ──
    let supplier_id: string | null = supplier_hint?.supplier_id ?? null;

    if (!supplier_id && supplier_hint?.host) {
      // Essayer de matcher un fournisseur par website
      const { data: match } = await admin
        .from("suppliers")
        .select("id")
        .eq("company_id", company_id)
        .ilike("website", `%${supplier_hint.host}%`)
        .limit(1)
        .maybeSingle();
      if (match) supplier_id = match.id;
    }

    if (!supplier_id && supplier_hint?.name) {
      const { data: match } = await admin
        .from("suppliers")
        .select("id")
        .eq("company_id", company_id)
        .ilike("name", supplier_hint.name)
        .limit(1)
        .maybeSingle();
      if (match) supplier_id = match.id;
    }

    // ── Déterminer le statut selon le rôle ──
    const isPrivileged = role === "admin" || role === "super_admin" || role === "sales_manager";
    const status = isPrivileged ? "approved" : "proposed";

    // ── Coût total ──
    const total_cost_cents =
      (offer.price_cents ?? 0) + (offer.delivery_cost_cents ?? 0);

    // ── Offer snapshot figé ──
    const offer_snapshot = {
      title: offer.title,
      price_cents: offer.price_cents,
      delivery_cost_cents: offer.delivery_cost_cents ?? 0,
      delivery_days_min: offer.delivery_days_min,
      delivery_days_max: offer.delivery_days_max,
      condition: offer.condition ?? "unknown",
      warranty_months: offer.warranty_months,
      url: offer.url,
      image_url: offer.image_url,
      stock_status: offer.stock_status ?? "unknown",
      currency: offer.currency ?? "EUR",
      raw_specs: offer.raw_specs ?? null,
      captured_at: new Date().toISOString(),
      captured_host: supplier_hint?.host ?? null,
    };

    // ── Insert ──
    const now = new Date().toISOString();
    const insertPayload: Record<string, unknown> = {
      company_id,
      equipment_order_unit_id: target.equipment_order_unit_id ?? null,
      contract_equipment_id: target.contract_equipment_id ?? null,
      offer_equipment_id: target.offer_equipment_id ?? null,
      supplier_id,
      offer_snapshot,
      rank: rank ?? null,
      total_cost_cents,
      status,
      source_channel,
      sourcing_search_id: sourcing_search_id ?? null,
      notes: notes ?? null,
      proposer_role: role,
      proposed_by: user.id,
      proposed_at: now,
    };

    if (isPrivileged) {
      insertPayload.selected_by = user.id;
      insertPayload.selected_at = now;
      insertPayload.validated_by = user.id;
      insertPayload.validated_at = now;
    }

    const { data: created, error: insertErr } = await admin
      .from("order_line_sourcing")
      .insert(insertPayload)
      .select("id, status")
      .single();

    if (insertErr) {
      console.error("Erreur insert order_line_sourcing:", insertErr);
      return fail(`Erreur insertion : ${insertErr.message}`, 500);
    }

    return ok({
      success: true,
      id: created.id,
      status: created.status,
      needs_validation: status === "proposed",
      supplier_matched: supplier_id !== null,
    });
  } catch (e: any) {
    console.error("Erreur sourcing-ingest-offer:", e);
    return fail(e.message ?? "Erreur interne", 500);
  }
});
