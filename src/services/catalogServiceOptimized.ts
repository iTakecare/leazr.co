import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/catalog";

// Optimized service that loads only essential product data without variants
export const getPublicProductsOptimized = async (companyId: string): Promise<Product[]> => {
  if (!companyId) {
    throw new Error("Company ID requis");
  }

  try {
    // Single optimized query without variant joins
    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        description,
        brand,
        category,
        price,
        monthly_price,
        image_url,
        images,
        co2_savings,
        has_variants,
        variants_count,
        active,
        brands(name, translation),
        categories(name, translation)
      `)
      .eq("company_id", companyId)
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Simple mapping without heavy processing
    const mappedProducts: Product[] = (data || []).map(item => ({
      id: item.id,
      name: item.name || "",
      description: item.description || "",
      brand: item.brands?.name || item.brand || "",
      category: item.categories?.name || item.category || "",
      price: item.price || 0,
      monthly_price: item.monthly_price || 0,
      image_url: item.image_url || "",
      images: item.images || [],
      co2_savings: item.co2_savings || 0,
      has_variants: item.has_variants || false,
      variants_count: item.variants_count || 0,
      active: item.active || false,
      // Don't load variants or variant_combination_prices for performance
      variants: [],
      variant_combination_prices: []
    }));

    return mappedProducts;
  } catch (error) {
    console.error("Error loading optimized products:", error);
    throw error;
  }
};