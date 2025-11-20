import { supabase } from "@/integrations/supabase/client";
import { UpsellProduct } from "@/types/categoryTypes";
import { getRelatedProducts } from "./catalogServiceOptimized";

export const getUpsellProducts = async (
  categoryId: string,
  companyId: string,
  currentProductId?: string,
  limit: number = 12
): Promise<UpsellProduct[]> => {
  console.log("🎯 getUpsellProducts", { categoryId, companyId, currentProductId, limit });

  // 1. Récupérer la catégorie et son type
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id, name, category_type_id")
    .eq("id", categoryId)
    .single();

  if (categoryError || !category) {
    console.error("❌ Category not found", categoryError);
    return [];
  }

  // Si pas de type, fallback sur ancien système
  if (!category.category_type_id) {
    console.log("⚠️ No category type, falling back to old system");
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
      upsell_reason: 'Produits similaires'
    }));
  }

  // 2. Récupérer les types compatibles via category_compatibilities
  const { data: compatibilities, error: compatError } = await supabase
    .from("category_compatibilities")
    .select("child_category_type_id, compatibility_strength")
    .eq("parent_category_type_id", category.category_type_id);

  if (compatError) {
    console.error("❌ Error fetching compatibilities", compatError);
  }

  const compatibleTypeIds = compatibilities?.map(c => c.child_category_type_id) || [];
  console.log("✅ Compatible types:", compatibleTypeIds);

  // 3. Récupérer les catégories liées via category_specific_links
  const { data: specificLinks, error: linksError } = await supabase
    .from("category_specific_links")
    .select("child_category_id, priority, link_type")
    .eq("parent_category_id", categoryId);

  if (linksError) {
    console.error("❌ Error fetching specific links", linksError);
  }

  const linkedCategoryIds = specificLinks?.map(link => link.child_category_id) || [];
  console.log("✅ Linked categories:", linkedCategoryIds);

  // 4. Récupérer les catégories compatibles (type-based)
  const { data: compatibleCategories } = await supabase
    .from("categories")
    .select("id")
    .in("category_type_id", compatibleTypeIds)
    .eq("company_id", companyId);

  const compatibleCategoryIds = compatibleCategories?.map(c => c.id) || [];

  // Fusionner tous les IDs de catégories
  const allCategoryIds = Array.from(new Set([...compatibleCategoryIds, ...linkedCategoryIds]));

  if (allCategoryIds.length === 0) {
    console.log("⚠️ No compatible categories found");
    return [];
  }

  console.log("📦 Fetching products from categories:", allCategoryIds);

  // 5. Récupérer les produits de ces catégories
  let query = supabase
    .from("products")
    .select(`
      id, name, slug, price, monthly_price, image_url, 
      brand, description, short_description, active,
      category_id,
      categories (id, name)
    `)
    .in("category_id", allCategoryIds)
    .eq("company_id", companyId)
    .eq("active", true);

  if (currentProductId) {
    query = query.neq("id", currentProductId);
  }

  const { data: products, error: productsError } = await query;

  if (productsError) {
    console.error("❌ Error fetching products", productsError);
    return [];
  }

  if (!products || products.length === 0) {
    console.log("⚠️ No products found");
    return [];
  }

  // 6. Mapper les résultats avec upsell_source
  const upsellProducts: UpsellProduct[] = products.map(product => {
    const isFromException = linkedCategoryIds.includes(product.category_id!);
    const isFromCompatibility = compatibleCategoryIds.includes(product.category_id!);
    
    let upsellSource: 'compatibility' | 'exception' | 'both';
    if (isFromException && isFromCompatibility) {
      upsellSource = 'both';
    } else if (isFromException) {
      upsellSource = 'exception';
    } else {
      upsellSource = 'compatibility';
    }

    // Trouver la force/priorité
    const exception = specificLinks?.find(link => link.child_category_id === product.category_id);
    const compat = compatibilities?.find(c => 
      compatibleCategories?.some(cat => 
        cat.id === product.category_id && 
        cat.category_type_id === c.child_category_type_id
      )
    );

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      monthly_price: product.monthly_price,
      image_url: product.image_url,
      brand: product.brand,
      category: product.categories?.name,
      description: product.description,
      short_description: product.short_description,
      active: product.active,
      upsell_source: upsellSource,
      upsell_strength: exception?.priority || compat?.compatibility_strength || 1,
      upsell_reason: upsellSource === 'exception' 
        ? 'Recommandé spécifiquement' 
        : 'Compatible avec votre sélection'
    };
  });

  // 7. Trier par priorité
  upsellProducts.sort((a, b) => {
    // Exceptions d'abord
    if (a.upsell_source === 'exception' && b.upsell_source !== 'exception') return -1;
    if (b.upsell_source === 'exception' && a.upsell_source !== 'exception') return 1;
    
    // Par force/priorité
    if ((b.upsell_strength || 0) !== (a.upsell_strength || 0)) {
      return (b.upsell_strength || 0) - (a.upsell_strength || 0);
    }
    
    // Par prix
    return (a.price || 0) - (b.price || 0);
  });

  // 8. Limiter les résultats
  const limitedProducts = upsellProducts.slice(0, limit);
  console.log(`✅ Returning ${limitedProducts.length} upsell products`);

  return limitedProducts;
};
