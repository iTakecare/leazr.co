/**
 * platform-secret
 *
 * Gère les secrets plateforme (table platform_secrets) depuis le SaaS admin.
 * Réservé au super_admin. Le navigateur ne récupère JAMAIS la valeur d'un
 * secret — seulement un statut "configuré / non configuré".
 *
 *  POST { action: "set",    key, value }   → enregistre/écrase un secret
 *  POST { action: "status", keys: [...] }  → { [key]: boolean } (configuré ?)
 */
import { requireElevatedAccess } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Clés autorisées à être gérées via cette interface.
const ALLOWED_KEYS = new Set<string>(["MOLLIE_API_KEY"]);

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  // Auth : super_admin uniquement (pas de raccourci service_role inter-tenant ici).
  const access = await requireElevatedAccess(req, corsHeaders, {
    allowedRoles: ["super_admin"],
    allowServiceRole: false,
  });
  if (!access.ok) return access.response;
  const { supabaseAdmin, userId } = access.context;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Corps JSON invalide" });
  }

  const action = body?.action;

  if (action === "status") {
    const keys: string[] = Array.isArray(body.keys) ? body.keys : [];
    const { data } = await supabaseAdmin
      .from("platform_secrets")
      .select("key, value")
      .in("key", keys);
    const status: Record<string, boolean> = {};
    for (const k of keys) status[k] = false;
    for (const row of data ?? []) {
      status[(row as any).key] = !!(row as any).value;
    }
    return json(200, { status });
  }

  if (action === "set") {
    const key = String(body.key || "");
    const value = String(body.value ?? "");
    if (!ALLOWED_KEYS.has(key)) return json(400, { error: "Clé non autorisée" });
    if (!value.trim()) return json(400, { error: "Valeur vide" });

    const { error } = await supabaseAdmin
      .from("platform_secrets")
      .upsert(
        { key, value: value.trim(), updated_at: new Date().toISOString(), updated_by: userId },
        { onConflict: "key" },
      );
    if (error) return json(500, { error: error.message });
    return json(200, { success: true });
  }

  return json(400, { error: "Action inconnue" });
});
