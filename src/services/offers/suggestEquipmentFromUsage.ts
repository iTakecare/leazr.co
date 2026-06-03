import { supabase } from "@/integrations/supabase/client";

export type UsageMobility = "sedentary" | "nomadic" | "hybrid";

export interface UsageInput {
  profile?: string;
  seats?: number;
  software?: string;
  mobility?: UsageMobility;
  needs?: string[];
  monthlyBudget?: number;
  description?: string;
}

export interface EquipmentSuggestion {
  product_id: string;
  name: string;
  brand: string;
  category: string;
  image_url: string | null;
  price: number;
  monthly_price: number;
  quantity: number;
  reason: string;
}

export interface SuggestEquipmentResult {
  suggestions: EquipmentSuggestion[];
  rationale: string;
  catalogSize: number;
  warnings: string[];
}

/**
 * Appelle l'edge function IA qui recommande de l'équipement du catalogue
 * en fonction de l'usage décrit. Renvoie des suggestions déjà validées
 * (produits garantis présents dans le catalogue de la société).
 */
export const suggestEquipmentFromUsage = async (
  usage: UsageInput,
  companyId?: string,
): Promise<SuggestEquipmentResult> => {
  const { data, error } = await supabase.functions.invoke(
    "suggest-equipment-from-usage",
    {
      body: { usage, ...(companyId ? { companyId } : {}) },
    },
  );

  if (error) {
    // Les erreurs HTTP de l'edge function arrivent ici ; le corps JSON peut
    // contenir un message plus précis.
    const msg = (data as any)?.message || error.message || "Échec de la suggestion IA";
    throw new Error(msg);
  }

  if (!data?.success) {
    throw new Error((data as any)?.message || "Aucune suggestion générée");
  }

  return {
    suggestions: data.suggestions || [],
    rationale: data.rationale || "",
    catalogSize: data.catalogSize || 0,
    warnings: data.warnings || [],
  };
};
