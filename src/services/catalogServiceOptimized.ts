import { supabase } from "@/integrations/supabase/client";
import { Product, PublicPack } from "@/types/catalog";

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
        admin_only,
        brands(name, translation),
        categories(name, translation)
      `)
      .eq("company_id", companyId)
      .eq("active", true)
      .or("admin_only.is.null,admin_only.eq.false")
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
        admin_only,
        brands(name, translation),
        categories(name, translation)
      `)
      .eq("company_id", companyId)
      .eq("active", true)
      .or("admin_only.is.null,admin_only.eq.false");

    // Filter by brand first (higher priority), then category
    if (brand) {
      query = query.filter(`brand_name.eq."${brand}" or brands.name.eq."${brand}"`);
    } else if (category) {
      query = query.filter(`category_name.eq."${category}" or categories.name.eq."${category}"`);
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

// Optimized service to get public packs for a company
export const getPublicPacksOptimized = async (companyId: string): Promise<PublicPack[]> => {
  if (!companyId) {
    throw new Error("Company ID requis");
  }

  try {
    // Get active packs with their items
    const { data: packsData, error } = await supabase
      .from("product_packs")
      .select(`
        id,
        name,
        description,
        image_url,
        is_featured,
        is_active,
        pack_monthly_price,
        pack_promo_price,
        promo_active,
        total_monthly_price,
        product_pack_items(
          quantity,
          products(
            id,
            name,
            image_url,
            category_name,
            categories(name, translation)
          )
        )
      `)
      .eq("company_id", companyId)
      .eq("is_active", true)
      .or("admin_only.is.null,admin_only.eq.false")
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Map to PublicPack format
    const mappedPacks: PublicPack[] = (packsData || []).map(pack => ({
      id: pack.id,
      name: pack.name || "",
      description: pack.description || "",
      image_url: pack.image_url || "",
      is_featured: pack.is_featured || false,
      pack_monthly_price: pack.pack_monthly_price || 0,
      pack_promo_price: pack.pack_promo_price || 0,
      promo_active: pack.promo_active || false,
      total_monthly_price: pack.total_monthly_price || 0,
      items: (pack.product_pack_items || []).map(item => ({
        quantity: item.quantity || 1,
        product: {
          id: item.products?.id || "",
          name: item.products?.name || "",
          image_url: item.products?.image_url || "",
          category: item.products?.categories?.name || item.products?.category_name || ""
        }
      }))
    }));

    return mappedPacks;
  } catch (error) {
    console.error("Error loading public packs:", error);
    throw error;
  }
};