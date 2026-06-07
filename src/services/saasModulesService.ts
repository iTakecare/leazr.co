import { supabase } from "@/integrations/supabase/client";
import type { SaasPlanId } from "@/config/saasPlans";

export interface SaasModule {
  slug: string;
  name: string;
  description: string;
  isCore: boolean;
  priceStarter: number; // €/mois en add-on sur le plan Starter
  pricePro: number;
  priceBusiness: number;
}

export interface EditableModuleFields {
  name: string;
  description: string;
  isCore: boolean;
  priceStarter: number;
  pricePro: number;
  priceBusiness: number;
}

interface ModuleRow {
  slug: string;
  name: string;
  description: string | null;
  is_core: boolean;
  price_starter: number | null;
  price_pro: number | null;
  price_business: number | null;
}

const rowToModule = (r: ModuleRow): SaasModule => ({
  slug: r.slug,
  name: r.name,
  description: r.description ?? "",
  isCore: r.is_core,
  priceStarter: Number(r.price_starter ?? 0),
  pricePro: Number(r.price_pro ?? 0),
  priceBusiness: Number(r.price_business ?? 0),
});

/** Catalogue global des modules Leazr. */
export const fetchModulesCatalog = async (): Promise<SaasModule[]> => {
  const { data, error } = await supabase
    .from("modules")
    .select("slug, name, description, is_core, price_starter, price_pro, price_business")
    .order("is_core", { ascending: false })
    .order("name", { ascending: true });
  if (error || !data) return [];
  return (data as ModuleRow[]).map(rowToModule);
};

/** Met à jour un module (réservé au super_admin via RLS). */
export const updateModule = async (
  slug: string,
  fields: EditableModuleFields,
): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase
    .from("modules")
    .update({
      name: fields.name,
      description: fields.description,
      is_core: fields.isCore,
      price_starter: fields.priceStarter,
      price_pro: fields.pricePro,
      price_business: fields.priceBusiness,
    })
    .eq("slug", slug);
  if (error) return { success: false, error: error.message };
  return { success: true };
};

/** Modules inclus (socle) par plan : { planId: [slug, ...] }. */
export const fetchPlanModules = async (): Promise<Record<string, string[]>> => {
  const { data, error } = await supabase
    .from("plan_modules")
    .select("plan_id, module_slug");
  if (error || !data) return {};
  return data.reduce((acc: Record<string, string[]>, row: any) => {
    (acc[row.plan_id] ??= []).push(row.module_slug);
    return acc;
  }, {});
};

/** Remplace l'ensemble des modules inclus d'un plan (super_admin). */
export const setPlanModules = async (
  planId: SaasPlanId,
  slugs: string[],
): Promise<{ success: boolean; error?: string }> => {
  const { error: delErr } = await supabase.from("plan_modules").delete().eq("plan_id", planId);
  if (delErr) return { success: false, error: delErr.message };
  if (slugs.length > 0) {
    const rows = slugs.map((module_slug) => ({ plan_id: planId, module_slug }));
    const { error: insErr } = await supabase.from("plan_modules").insert(rows);
    if (insErr) return { success: false, error: insErr.message };
  }
  return { success: true };
};

/** Prix d'un module pour un tier donné. */
export const moduleTierPrice = (m: SaasModule, planId: SaasPlanId): number => {
  if (planId === "pro") return m.pricePro;
  if (planId === "business") return m.priceBusiness;
  return m.priceStarter;
};

/**
 * Coût mensuel HYBRIDE (en euros) = prix de base du plan
 *   + somme des add-ons (modules activés qui ne sont NI core NI inclus dans le plan),
 *     facturés au tarif du tier.
 */
export const computeMonthlyPrice = (params: {
  planId: SaasPlanId;
  planBasePrice: number;
  includedSlugs: string[];
  enabledSlugs: string[];
  catalog: SaasModule[];
}): { total: number; addOns: { slug: string; name: string; price: number }[] } => {
  const { planId, planBasePrice, includedSlugs, enabledSlugs, catalog } = params;
  const included = new Set(includedSlugs);
  const addOns: { slug: string; name: string; price: number }[] = [];

  for (const m of catalog) {
    if (m.isCore) continue; // core toujours inclus
    if (included.has(m.slug)) continue; // déjà inclus dans le plan
    if (!enabledSlugs.includes(m.slug)) continue; // non activé par le tenant
    const price = moduleTierPrice(m, planId);
    if (price > 0) addOns.push({ slug: m.slug, name: m.name, price });
  }

  const total = planBasePrice + addOns.reduce((s, a) => s + a.price, 0);
  return { total, addOns };
};
