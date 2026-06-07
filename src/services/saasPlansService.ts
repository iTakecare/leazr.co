import { supabase } from "@/integrations/supabase/client";
import {
  SAAS_PLANS_LIST,
  type SaasPlan,
  type SaasPlanId,
} from "@/config/saasPlans";

/** Champs éditables d'un plan depuis le SaaS admin. */
export interface EditableSaasPlanFields {
  name: string;
  priceCents: number;
  description: string;
  features: string[];
  maxUsers: number;
  maxModules: number;
  popular: boolean;
  isActive: boolean;
}

interface SaasPlanRow {
  plan_id: string;
  name: string;
  price_cents: number;
  description: string | null;
  features: unknown;
  max_users: number;
  max_modules: number;
  popular: boolean;
  sort_order: number;
  is_active: boolean;
}

const rowToPlan = (r: SaasPlanRow): SaasPlan => ({
  id: r.plan_id as SaasPlanId,
  name: r.name,
  price: Math.round(r.price_cents) / 100,
  priceCents: r.price_cents,
  description: r.description ?? "",
  features: Array.isArray(r.features) ? (r.features as string[]) : [],
  maxUsers: r.max_users,
  maxModules: r.max_modules,
  popular: r.popular,
});

/**
 * Récupère la grille tarifaire depuis la DB (source de vérité éditable).
 * En cas d'erreur / table vide, repli sur la constante typée SAAS_PLANS_LIST.
 */
export const fetchSaasPlans = async (
  opts?: { includeInactive?: boolean },
): Promise<SaasPlan[]> => {
  let query = supabase
    .from("saas_plans")
    .select("plan_id, name, price_cents, description, features, max_users, max_modules, popular, sort_order, is_active")
    .order("sort_order", { ascending: true });

  if (!opts?.includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) {
    return SAAS_PLANS_LIST;
  }
  return (data as SaasPlanRow[]).map(rowToPlan);
};

/** Met à jour un plan (réservé au super_admin via RLS). */
export const updateSaasPlan = async (
  planId: string,
  fields: EditableSaasPlanFields,
): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase
    .from("saas_plans")
    .update({
      name: fields.name,
      price_cents: fields.priceCents,
      description: fields.description,
      features: fields.features,
      max_users: fields.maxUsers,
      max_modules: fields.maxModules,
      popular: fields.popular,
      is_active: fields.isActive,
    })
    .eq("plan_id", planId);

  if (error) return { success: false, error: error.message };
  return { success: true };
};
