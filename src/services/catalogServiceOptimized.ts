import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/catalog";

// Optimized service that loads only essential product data without variants
export const getPublicProductsOptimized = async (companyId: string): Promise<Product[]> => {
  if (!companyId) {
    throw new Error("Company ID requis");
  }

  try {
    // First get products
    const { data: productsData, error } = await supabase
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
        categories(name, translation)
      `)
      .eq("company_id", companyId)
      .eq("active", true)
      .eq("admin_only", false)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Get variant prices for all products
    const productIds = productsData?.map(p => p.id) || [];
    const { data: variantPrices } = await supabase
      .from("product_variant_prices")
      .select("product_id, monthly_price")
      .in("product_id", productIds)
      .gt("monthly_price", 0);

    // Create a map of minimum prices by product
    const minPriceMap = new Map<string, number>();
    variantPrices?.forEach(vp => {
      const currentMin = minPriceMap.get(vp.product_id) || Infinity;
      if (vp.monthly_price < currentMin) {
        minPriceMap.set(vp.product_id, vp.monthly_price);
      }
    });


    // Simple mapping with minimum pricing and pre-calculated slug
    const mappedProducts: Product[] = (productsData || []).map(item => {
      const minVariantPrice = minPriceMap.get(item.id) || 0;
      return {
        id: item.id,
        name: item.name || "",
        description: item.description || "",
        brand: item.brands?.name || item.brand_name || "",
        category: item.categories?.name || item.category_name || "",
        price: item.price || 0,
        monthly_price: item.monthly_price || 0,
        min_variant_price: minVariantPrice,
        slug: item.slug || "",
        image_url: item.image_url || "",
        images: item.imageurls || [],
        co2_savings: 0, // Default value since column doesn't exist
        has_variants: minVariantPrice > 0,
        variants_count: 0, // Default value since column doesn't exist
        active: item.active || false,
        // Don't load variants or variant_combination_prices for performance
        variants: [],
        variant_combination_prices: []
      };
    });

    return mappedProducts;
  } catch (error) {
    console.error("Error loading optimized products:", error);
    throw error;
  }
};

// Optimized function to get related products without loading all products
export const getRelatedProducts = async (
  companyId: string, 
  category?: string, 
  brand?: string, 
  currentProductId?: string, 
  limit: number = 6
): Promise<Product[]> => {
  if (!companyId || (!category && !brand)) {
    return [];
  }

  try {
    let query = supabase
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
        categories(name, translation)
      `)
      .eq("company_id", companyId)
      .eq("active", true)
      .eq("admin_only", false);

    // Filter by brand first (higher priority), then category
    if (brand) {
      query = query.or(`brand_name.eq.${brand},brands.name.eq.${brand}`);
    } else if (category) {
      query = query.or(`category_name.eq.${category},categories.name.eq.${category}`);
    }

    // Exclude current product
    if (currentProductId) {
      query = query.neq("id", currentProductId);
    }

    const { data: productsData, error } = await query
      .limit(limit)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    if (!productsData || productsData.length === 0) {
      return [];
    }

    // Get variant prices for these specific products
    const productIds = productsData.map(p => p.id);
    const { data: variantPrices } = await supabase
      .from("product_variant_prices")
      .select("product_id, monthly_price")
      .in("product_id", productIds)
      .gt("monthly_price", 0);

    // Create a map of minimum prices by product
    const minPriceMap = new Map<string, number>();
    variantPrices?.forEach(vp => {
      const currentMin = minPriceMap.get(vp.product_id) || Infinity;
      if (vp.monthly_price < currentMin) {
        minPriceMap.set(vp.product_id, vp.monthly_price);
      }
    });

    // Map products with minimum pricing
    const mappedProducts: Product[] = productsData.map(item => {
      const minVariantPrice = minPriceMap.get(item.id) || 0;
      return {
        id: item.id,
        name: item.name || "",
        description: item.description || "",
        brand: item.brands?.name || item.brand_name || "",
        category: item.categories?.name || item.category_name || "",
        price: item.price || 0,
        monthly_price: item.monthly_price || 0,
        min_variant_price: minVariantPrice,
        slug: item.slug || "",
        image_url: item.image_url || "",
        images: item.imageurls || [],
        co2_savings: 0,
        has_variants: minVariantPrice > 0,
        variants_count: 0,
        active: item.active || false,
        variants: [],
        variant_combination_prices: []
      };
    });

    return mappedProducts;
  } catch (error) {
    console.error("Error loading related products:", error);
    return [];
  }
};