/**
 * sourcing-list-suppliers
 *
 * Retourne les fournisseurs activés pour le sourcing.
 *  • Admin / sales_manager : voit les vrais noms + détails
 *  • Employé : reçoit des identifiants anonymes stables (#1, #2, …)
 *              basés sur un hash déterministe → même offre = même label
 *
 * L'extension Chrome appelle cette fonction au démarrage pour savoir quels
 * hosts déclencher la capture automatique.
 *
 * GET / POST (sans body nécessaire)
 * Response:
 * {
 *   suppliers: [{
 *     id: string,
 *     display_name: string,      // "Amazon Business FR" ou "Fournisseur #1"
 *     website: string | null,    // toujours visible (utile pour matching host)
 *     supports_refurbished: boolean,
 *     sourcing_adapter: string | null,
 *     logo_url: string | null,
 *   }],
 *   is_admin: boolean,
 * }
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function ok(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
function fail(msg: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: msg }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return fail("Non authentifié", 401);

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return fail("Non authentifié", 401);

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile } = await admin
      .from("profiles")
      .select("role, company_id")
      .eq("id", user.id)
      .single();

    if (!profile) return fail("Profil introuvable", 403);
    const isAdmin = profile.role === "admin" || profile.role === "super_admin" || profile.role === "sales_manager";

    const { data: suppliers, error } = await admin
      .from("suppliers")
      .select("id, name, website, supports_refurbished, sourcing_adapter, logo_url, sourcing_enabled")
      .eq("company_id", profile.company_id)
      .eq("is_active", true)
      .order("name");

    if (error) return fail(error.message, 500);

    // Anonymisation côté serveur si non-admin
    // Ordre stable : par id pour que les numéros restent cohérents entre appels
    const sorted = [...(suppliers ?? [])].sort((a, b) => a.id.localeCompare(b.id));
    const result = sorted.map((s, idx) => ({
      id: s.id,
      display_name: isAdmin ? s.name : `Fournisseur #${idx + 1}`,
      website: s.website,                                 // visible pour matching dans extension
      supports_refurbished: s.supports_refurbished ?? true,
      sourcing_adapter: s.sourcing_adapter,
      logo_url: isAdmin ? s.logo_url : null,              // logo masqué pour éviter de révéler la marque
      sourcing_enabled: s.sourcing_enabled ?? false,
    }));

    return ok({ suppliers: result, is_admin: isAdmin });
  } catch (e: any) {
    console.error("Erreur sourcing-list-suppliers:", e);
    return fail(e.message ?? "Erreur interne", 500);
  }
});
