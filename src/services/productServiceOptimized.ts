import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/catalog";

// Optimized service for finding products by slug directly in database
export const findProductBySlugDirectly = async (companyId: string, productSlug: string): Promise<Product | null> => {
  if (!companyId || !productSlug) {
    throw new Error("Company ID et slug produit requis");
  }

  try {
    // Direct SQL query using the slug column
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
        categories(name, translation)
      `)
      .eq("company_id", companyId)
      .eq("slug", productSlug)
      .eq("active", true)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    // Get variant prices for this product
    const { data: variantPrices } = await supabase
      .from("product_variant_prices")
      .select("monthly_price")
      .eq("product_id", data.id)
      .gt("monthly_price", 0);

    const minVariantPrice = variantPrices?.length > 0 
      ? Math.min(...variantPrices.map(vp => vp.monthly_price))
      : 0;

    // Map to Product interface
    const mappedProduct: Product = {
      id: data.id,
      name: data.name || "",
      description: data.description || "",
      brand: data.brands?.name || data.brand_name || "",
      category: data.categories?.name || data.category_name || "",
      price: data.price || 0,
      monthly_price: data.monthly_price || 0,
      min_variant_price: minVariantPrice,
      slug: data.slug || "",
      image_url: data.image_url || "",
      images: data.imageurls || [],
      has_variants: minVariantPrice > 0,
      variants_count: 0,
      active: data.active || false,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Don't load variants for performance
      variants: [],
      variant_combination_prices: []
    };

    return mappedProduct;
  } catch (error) {
    console.error("Error finding product by slug:", error);
    throw error;
  }
};