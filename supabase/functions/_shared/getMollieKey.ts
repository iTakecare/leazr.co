import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Récupère la clé API Mollie. Priorité à la valeur configurée depuis le SaaS
 * admin (table platform_secrets, lue en service_role), avec repli sur la
 * variable d'environnement MOLLIE_API_KEY pour rétro-compatibilité.
 */
export async function getMollieApiKey(): Promise<string | null> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (url && serviceKey) {
      const admin = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await admin
        .from("platform_secrets")
        .select("value")
        .eq("key", "MOLLIE_API_KEY")
        .maybeSingle();
      if (data?.value) return data.value as string;
    }
  } catch (_) {
    // table absente / erreur réseau → on retombe sur l'env
  }
  return Deno.env.get("MOLLIE_API_KEY") || null;
}
