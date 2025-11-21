import { supabase } from "@/integrations/supabase/client";
import { UpsellProduct } from "@/types/categoryTypes";
import { getRelatedProducts } from "./catalogServiceOptimized";

export const getUpsellProducts = async (
  categoryId: string,
  companyId: string,
  currentProductId?: string,
  limit: number = 12
): Promise<UpsellProduct[]> => {
  console.log("🎯 getUpsellProducts - Manual upsells only", { categoryId, companyId, currentProductId, limit });

  // Récupérer la catégorie
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id, name")
    .eq("id", categoryId)
    .single();

  if (categoryError || !category) {
    console.error("❌ Category not found", categoryError);
    return [];
  }

  // Fallback: produits similaires de la même catégorie
  console.log("⚠️ Using fallback: related products from same category");
  const oldProducts = await getRelatedProducts(
    companyId,
    category.name,
    undefined,
    currentProductId,
    limit
  );
  
  return oldProducts.map(p => ({
    ...p,
    upsell_source: 'compatibility' as const,
    upsell_reason: 'Produits similaires',
    createdAt: p.createdAt || new Date().toISOString(),
    updatedAt: p.updatedAt || new Date().toISOString(),
  }));
};
