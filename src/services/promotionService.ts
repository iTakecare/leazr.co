import { supabase } from "@/integrations/supabase/client";
import type { ClientPromotion, ClientPromotionInput } from "@/types/promotion";

const TABLE = "client_promotions";

/** Toutes les promos de la société (admin) — actives ou non. */
export const listPromotions = async (companyId: string): Promise<ClientPromotion[]> => {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .select("*")
    .eq("company_id", companyId)
    .order("placement", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as ClientPromotion[];
};

export const createPromotion = async (
  companyId: string,
  input: ClientPromotionInput
): Promise<ClientPromotion> => {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .insert({ ...input, company_id: companyId })
    .select("*")
    .single();
  if (error) throw error;
  return data as ClientPromotion;
};

export const updatePromotion = async (
  id: string,
  patch: Partial<ClientPromotionInput>
): Promise<void> => {
  const { error } = await (supabase as any)
    .from(TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
};

export const deletePromotion = async (id: string): Promise<void> => {
  const { error } = await (supabase as any).from(TABLE).delete().eq("id", id);
  if (error) throw error;
};
