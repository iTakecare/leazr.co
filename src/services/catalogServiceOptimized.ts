import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/catalog";

// Optimized service that loads only essential product data without variants
export const getPublicProductsOptimized = async (companyId: string): Promise<Product[]> => {
  if (!companyId) {
    throw new Error("Company ID requis");
  }

  try {
    // Optimized query with minimum price from variants and pre-calculated slug
    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        description,
        brand_name,
        category_name,
        price,
        monthly_price,
        image_url,
        imageurls,
        slug,
        active,
        brands(name, translation),
        categories(name, translation),
        min_variant_price:product_variant_prices(monthly_price)
      `)
      .eq("company_id", companyId)
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Simple mapping with minimum pricing and pre-calculated slug
    const mappedProducts: Product[] = (data || []).map(item => ({
      id: item.id,
      name: item.name || "",
      description: item.description || "",
      brand: item.brands?.name || item.brand_name || "",
      category: item.categories?.name || item.category_name || "",
      price: item.price || 0,
      monthly_price: item.monthly_price || 0,
      min_variant_price: Array.isArray(item.min_variant_price) ? Math.min(...item.min_variant_price.filter(p => p > 0)) : 0,
      slug: item.slug || "",
      image_url: item.image_url || "",
      images: item.imageurls || [],
      co2_savings: 0, // Default value since column doesn't exist
      has_variants: Array.isArray(item.min_variant_price) && item.min_variant_price.some(p => p > 0),
      variants_count: 0, // Default value since column doesn't exist
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