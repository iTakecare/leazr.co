import { supabase } from "@/integrations/supabase/client";

/**
 * Secrets plateforme (clé Mollie, etc.) gérés via l'edge function
 * `platform-secret` (réservée au super_admin). La VALEUR n'est jamais
 * renvoyée au navigateur — uniquement un statut "configuré ?".
 */

export const setPlatformSecret = async (
  key: string,
  value: string,
): Promise<{ success: boolean; error?: string }> => {
  const { data, error } = await supabase.functions.invoke("platform-secret", {
    body: { action: "set", key, value },
  });
  if (error) return { success: false, error: error.message };
  if (!data?.success) return { success: false, error: data?.error || "Échec" };
  return { success: true };
};

export const getPlatformSecretStatus = async (
  keys: string[],
): Promise<Record<string, boolean>> => {
  const { data, error } = await supabase.functions.invoke("platform-secret", {
    body: { action: "status", keys },
  });
  if (error || !data?.status) return {};
  return data.status as Record<string, boolean>;
};
