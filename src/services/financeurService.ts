// Service côté FINANCEUR (équipe Winlease) : gestion des partenaires/brokers
// apporteurs et des grilles de coefficients. Tables hors types.ts générés →
// cast `as any` (même pattern que equipment_swaps).
import { supabase } from "@/integrations/supabase/client";
import {
  CoefficientGrid,
  CoefficientGridRange,
  FinancingPartner,
} from "@/types/financeur";

// ─────────────────────────── Partenaires ───────────────────────────

export const getFinancingPartners = async (): Promise<FinancingPartner[]> => {
  const { data, error } = await supabase
    .from("financing_partners" as any)
    .select("*")
    .order("name");
  if (error) throw error;
  return (data as unknown as FinancingPartner[]) || [];
};

export const createFinancingPartner = async (
  companyId: string,
  partner: Partial<FinancingPartner>
): Promise<FinancingPartner> => {
  const { data, error } = await supabase
    .from("financing_partners" as any)
    .insert([{ ...partner, company_id: companyId }])
    .select()
    .single();
  if (error) throw error;
  return data as unknown as FinancingPartner;
};

export const updateFinancingPartner = async (
  id: string,
  updates: Partial<FinancingPartner>
): Promise<void> => {
  const { error } = await supabase
    .from("financing_partners" as any)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
};

export const deleteFinancingPartner = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("financing_partners" as any)
    .delete()
    .eq("id", id);
  if (error) throw error;
};

/** Crée le compte utilisateur du partenaire et envoie l'email d'activation. */
export const createFinancingPartnerAccount = async (
  partner: FinancingPartner
): Promise<{ success: boolean; error?: string }> => {
  if (!partner.email) {
    return { success: false, error: "Ce partenaire n'a pas d'adresse email" };
  }
  const { data, error } = await supabase.functions.invoke("create-account-custom", {
    body: {
      email: partner.email,
      entityType: "financing_partner",
      entityId: partner.id,
      companyId: partner.company_id,
      firstName: partner.contact_name?.split(" ")[0] || partner.name,
      lastName: partner.contact_name?.split(" ").slice(1).join(" ") || "",
      role: "partner",
    },
  });
  if (error) return { success: false, error: error.message };
  if (!data?.success) return { success: false, error: data?.error || "Erreur inconnue" };
  return { success: true };
};

// ─────────────────────────── Grilles de coefficients ───────────────────────────

export const getCoefficientGrids = async (): Promise<CoefficientGrid[]> => {
  const { data, error } = await supabase
    .from("coefficient_grids" as any)
    .select("*")
    .order("name");
  if (error) throw error;
  const grids = (data as unknown as CoefficientGrid[]) || [];
  if (grids.length === 0) return grids;

  const { data: rangesData, error: rangesError } = await supabase
    .from("coefficient_grid_ranges" as any)
    .select("*")
    .in("grid_id", grids.map((g) => g.id))
    .order("duration_months")
    .order("min");
  if (rangesError) throw rangesError;
  const ranges = (rangesData as unknown as CoefficientGridRange[]) || [];
  return grids.map((g) => ({ ...g, ranges: ranges.filter((r) => r.grid_id === g.id) }));
};

export const createCoefficientGrid = async (
  companyId: string,
  name: string,
  isDefault = false
): Promise<CoefficientGrid> => {
  const { data, error } = await supabase
    .from("coefficient_grids" as any)
    .insert([{ company_id: companyId, name, is_default: isDefault }])
    .select()
    .single();
  if (error) throw error;
  return data as unknown as CoefficientGrid;
};

export const updateCoefficientGrid = async (
  id: string,
  updates: { name?: string; is_default?: boolean }
): Promise<void> => {
  const { error } = await supabase
    .from("coefficient_grids" as any)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
};

export const deleteCoefficientGrid = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("coefficient_grids" as any)
    .delete()
    .eq("id", id);
  if (error) throw error;
};

/** Remplace l'intégralité des tranches d'une grille. */
export const saveGridRanges = async (
  gridId: string,
  ranges: CoefficientGridRange[]
): Promise<void> => {
  const { error: delError } = await supabase
    .from("coefficient_grid_ranges" as any)
    .delete()
    .eq("grid_id", gridId);
  if (delError) throw delError;

  if (ranges.length > 0) {
    const { error } = await supabase.from("coefficient_grid_ranges" as any).insert(
      ranges.map((r) => ({
        grid_id: gridId,
        min: r.min,
        max: r.max,
        duration_months: r.duration_months,
        coefficient: r.coefficient,
      }))
    );
    if (error) throw error;
  }
};
