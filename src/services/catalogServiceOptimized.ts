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

    // Use separate queries to avoid multiple or= clauses issue
    let allProducts: any[] = [];

    if (brand) {
      // Query 1: Search by brand_name
      let brandQuery1 = supabase
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
        .eq("brand_name", brand);

      if (currentProductId) {
        brandQuery1 = brandQuery1.neq("id", currentProductId);
      }

      const { data: brandData1 } = await brandQuery1
        .limit(limit)
        .order("created_at", { ascending: false });

      // Query 2: Search by brands.name
      let brandQuery2 = supabase
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
        .eq("brands.name", brand);

      if (currentProductId) {
        brandQuery2 = brandQuery2.neq("id", currentProductId);
      }

      const { data: brandData2 } = await brandQuery2
        .limit(limit)
        .order("created_at", { ascending: false });

      // Merge results and remove duplicates
      const combined = [...(brandData1 || []), ...(brandData2 || [])];
      const uniqueProducts = combined.filter((product, index, self) => 
        index === self.findIndex(p => p.id === product.id)
      );
      allProducts = uniqueProducts.slice(0, limit);

    } else if (category) {
      // Query 1: Search by category_name
      let categoryQuery1 = supabase
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
        .eq("category_name", category);

      if (currentProductId) {
        categoryQuery1 = categoryQuery1.neq("id", currentProductId);
      }

      const { data: categoryData1 } = await categoryQuery1
        .limit(limit)
        .order("created_at", { ascending: false });

      // Query 2: Search by categories.name
      let categoryQuery2 = supabase
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
        .eq("categories.name", category);

      if (currentProductId) {
        categoryQuery2 = categoryQuery2.neq("id", currentProductId);
      }

      const { data: categoryData2 } = await categoryQuery2
        .limit(limit)
        .order("created_at", { ascending: false });

      // Merge results and remove duplicates
      const combined = [...(categoryData1 || []), ...(categoryData2 || [])];
      const uniqueProducts = combined.filter((product, index, self) => 
        index === self.findIndex(p => p.id === product.id)
      );
      allProducts = uniqueProducts.slice(0, limit);

    } else {
      // Fallback: get any products from the same company
      let fallbackQuery = supabase
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

      if (currentProductId) {
        fallbackQuery = fallbackQuery.neq("id", currentProductId);
      }

      const { data } = await fallbackQuery
        .limit(limit)
        .order("created_at", { ascending: false });
      
      allProducts = data || [];
    }

    const productsData = allProducts;
    const error = null;

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
        createdAt: new Date(),
        updatedAt: new Date(),
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

/**
 * Service pour récupérer le catalogue personnalisé d'un client spécifique
 * Ne retourne que les produits avec des prix personnalisés pour ce client
 */
export const getUpsellProducts = async (
  companyId: string,
  currentProductId: string,
  category?: string,
  brand?: string
): Promise<Product[]> => {
  try {
    // First, try to get the current product to check for upsell IDs
    const { data: currentProduct } = await supabase
      .from('products')
      .select('upsell_ids, cross_sell_ids')
      .eq('id', currentProductId)
      .single();

    let upsellIds: string[] = [];
    
    // Check for specific upsell/cross-sell IDs
    if (currentProduct?.upsell_ids && Array.isArray(currentProduct.upsell_ids)) {
      upsellIds = currentProduct.upsell_ids;
    } else if (currentProduct?.cross_sell_ids && Array.isArray(currentProduct.cross_sell_ids)) {
      upsellIds = currentProduct.cross_sell_ids;
    }

    let query = supabase
      .from('products')
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
        product_variant_prices(monthly_price)
      `)
      .eq('company_id', companyId)
      .eq('active', true)
      .neq('id', currentProductId);

    // If we have specific upsell IDs, use them
    if (upsellIds.length > 0) {
      query = query.in('id', upsellIds);
    } else {
      // Fallback: get products from same category or brand
      if (category && brand) {
        query = query.or(`category_name.eq.${category},brand_name.eq.${brand}`);
      } else if (category) {
        query = query.eq('category_name', category);
      } else if (brand) {
        query = query.eq('brand_name', brand);
      }
    }

    const { data, error } = await query.limit(6);

    if (error) {
      console.error('Error fetching upsell products:', error);
      return [];
    }

    // Map to Product type and calculate minimum prices
    const products: Product[] = (data || []).map(product => {
      let minPrice = product.monthly_price || 0;
      
      // If product has variants, get minimum price from variants
      if (product.product_variant_prices && product.product_variant_prices.length > 0) {
        const variantPrices = product.product_variant_prices
          .map((vp: any) => vp.monthly_price)
          .filter((price: number) => price > 0);
        if (variantPrices.length > 0) {
          minPrice = Math.min(...variantPrices);
        }
      }

      return {
        id: product.id,
        name: product.name || "",
        description: product.description || "",
        brand: product.brands?.name || product.brand_name || "",
        category: product.categories?.name || product.category_name || "",
        price: product.price || 0,
        monthly_price: minPrice,
        slug: product.slug || "",
        image_url: product.image_url || "",
        images: product.imageurls || [],
        co2_savings: 0,
        has_variants: false,
        variants_count: 0,
        active: product.active || false,
        createdAt: new Date(),
        updatedAt: new Date(),
        variants: [],
        variant_combination_prices: []
      };
    });

    return products;
  } catch (error) {
    console.error('Error in getUpsellProducts:', error);
    return [];
  }
};

export const getClientCustomCatalog = async (clientId: string): Promise<Product[]> => {
  if (!clientId) {
    throw new Error("Client ID requis pour le catalogue personnalisé");
  }

  try {
    console.log('🛒 CATALOGUE PERSONNALISÉ - Chargement pour client:', clientId);

    // Étape 1: Récupérer les prix personnalisés avec les IDs des produits
    const { data: customPricesData, error } = await supabase
      .from("client_custom_prices")
      .select(`
        product_id,
        custom_monthly_price,
        custom_purchase_price,
        margin_rate,
        is_active,
        valid_from,
        valid_to,
        notes
      `)
      .eq("client_id", clientId)
      .eq("is_active", true);

    if (error) {
      console.error('Erreur lors du chargement des prix personnalisés:', error);
      throw error;
    }

    if (!customPricesData || customPricesData.length === 0) {
      console.log('🛒 CATALOGUE PERSONNALISÉ - Aucun produit personnalisé trouvé pour ce client');
      return [];
    }

    // Filtrer les prix valides (sans date d'expiration ou pas encore expirés)
    const now = new Date().toISOString();
    const validPrices = customPricesData.filter(price => 
      !price.valid_to || new Date(price.valid_to).toISOString() >= now
    );

    if (validPrices.length === 0) {
      console.log('🛒 CATALOGUE PERSONNALISÉ - Aucun prix personnalisé valide trouvé');
      return [];
    }

    console.log('🛒 CATALOGUE PERSONNALISÉ - Prix personnalisés valides trouvés:', validPrices.length);

    // Extraire les IDs des produits
    const productIds = validPrices.map(item => item.product_id).filter(Boolean);

    // Étape 2: Récupérer les détails des produits
    const { data: productsData, error: productsError } = await supabase
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
      .in("id", productIds)
      .eq("active", true);

    if (productsError) {
      console.error('Erreur lors du chargement des produits:', productsError);
      throw productsError;
    }

    if (!productsData || productsData.length === 0) {
      console.log('🛒 CATALOGUE PERSONNALISÉ - Aucun produit actif trouvé');
      return [];
    }

    // Get client's hidden variants first
    const { data: clientData } = await supabase
      .from('clients')
      .select('hidden_variants')
      .eq('id', clientId)
      .single();
    
    const hiddenVariants = clientData?.hidden_variants || [];
    console.log(`🔒 Hidden variants for client ${clientId}:`, hiddenVariants);

    // Récupérer les prix personnalisés des variants pour ces produits
    const { data: customVariantPrices } = await supabase
      .from("client_custom_variant_prices")
      .select(`
        custom_monthly_price,
        custom_purchase_price,
        margin_rate,
        product_variant_prices (
          id,
          product_id,
          attributes,
          price,
          monthly_price,
          stock
        )
      `)
      .eq("client_id", clientId)
      .eq("is_active", true)
      .in("product_variant_prices.product_id", productIds);

    // Récupérer les combinaisons personnalisées pour ces produits
    const { data: customCombinations } = await supabase
      .from("client_custom_variant_combinations")
      .select(`
        id,
        product_id,
        attributes,
        custom_monthly_price,
        custom_purchase_price,
        is_available
      `)
      .eq("client_id", clientId)
      .eq("is_available", true)
      .in("product_id", productIds);

    // Créer une map des prix personnalisés des variants par product_id, filtering hidden variants
    const customVariantPriceMap = new Map<string, any[]>();
    customVariantPrices?.forEach(cvp => {
      const productId = cvp.product_variant_prices?.product_id;
      const variantPriceId = cvp.product_variant_prices?.id;
      
      // Skip if this variant is hidden for this client
      if (variantPriceId && hiddenVariants.includes(variantPriceId)) {
        console.log(`🔒 Filtering out hidden variant from catalog: ${variantPriceId}`);
        return;
      }
      
      if (productId) {
        if (!customVariantPriceMap.has(productId)) {
          customVariantPriceMap.set(productId, []);
        }
        customVariantPriceMap.get(productId)?.push({
          id: cvp.product_variant_prices?.id,
          attributes: cvp.product_variant_prices?.attributes,
          price: cvp.custom_purchase_price || cvp.product_variant_prices?.price,
          monthly_price: cvp.custom_monthly_price || (
            cvp.margin_rate 
              ? (cvp.product_variant_prices?.price || 0) * (1 + cvp.margin_rate)
              : cvp.product_variant_prices?.monthly_price
          ),
          stock: cvp.product_variant_prices?.stock
        });
      }
    });

    // Créer une map des combinaisons personnalisées par product_id
    const customCombinationsMap = new Map<string, any[]>();
    customCombinations?.forEach(combination => {
      if (combination.product_id) {
        if (!customCombinationsMap.has(combination.product_id)) {
          customCombinationsMap.set(combination.product_id, []);
        }
        customCombinationsMap.get(combination.product_id)?.push({
          id: combination.id,
          attributes: combination.attributes,
          monthly_price: combination.custom_monthly_price || 0,
          price: combination.custom_purchase_price || 0
        });
      }
    });

    // Étape 3: Mapper les produits avec leurs prix personnalisés
    const mappedProducts: Product[] = productsData.map(product => {
      // Trouver le prix personnalisé correspondant à ce produit
      const customPrice = validPrices.find(price => price.product_id === product.id);
      if (!customPrice) return null;

      // Calculer le prix personnalisé selon la logique définie
      let customMonthlyPrice = product.monthly_price || 0;
      let customPurchasePrice = product.price || 0;

      // Priorité : custom_monthly_price > calcul par margin_rate > prix standard
      if (customPrice.custom_monthly_price) {
        customMonthlyPrice = customPrice.custom_monthly_price;
      } else if (customPrice.margin_rate && product.price) {
        customMonthlyPrice = product.price * (1 + customPrice.margin_rate);
      }

      if (customPrice.custom_purchase_price) {
        customPurchasePrice = customPrice.custom_purchase_price;
      }

      // Récupérer les variants personnalisés pour ce produit
      const customVariants = customVariantPriceMap.get(product.id) || [];
      
      // Récupérer les combinaisons personnalisées pour ce produit
      const productCustomCombinations = customCombinationsMap.get(product.id) || [];

      // Combiner tous les prix disponibles (variants + combinaisons) pour calculer le minimum
      const allAvailablePrices = [
        ...customVariants.map(v => v.monthly_price).filter(p => p > 0),
        ...productCustomCombinations.map(c => c.monthly_price).filter(p => p > 0)
      ];

      // Si on a des prix de variants/combinaisons, prendre le minimum, sinon utiliser le prix de base
      const minVariantPrice = allAvailablePrices.length > 0 
        ? Math.min(...allAvailablePrices)
        : 0;

      // Un produit a des variants s'il a des variants personnalisés OU des combinaisons personnalisées
      const hasVariants = customVariants.length > 0 || productCustomCombinations.length > 0;
      const totalVariantsCount = customVariants.length + productCustomCombinations.length;

      return {
        id: product.id,
        name: product.name || "",
        description: product.description || "",
        brand: product.brands?.name || product.brand_name || "",
        category: product.categories?.name || product.category_name || "",
        price: customPurchasePrice,
        monthly_price: customMonthlyPrice,
        min_variant_price: minVariantPrice,
        slug: product.slug || "",
        image_url: product.image_url || "",
        images: product.imageurls || [],
        co2_savings: 0,
        has_variants: hasVariants,
        variants_count: totalVariantsCount,
        active: product.active || false,
        createdAt: new Date(),
        updatedAt: new Date(),
        // Ajouter les variants personnalisés
        variants: [],
        variant_combination_prices: customVariants,
        // Marquer comme prix personnalisé pour l'affichage
        is_custom_pricing: true,
        custom_pricing_notes: customPrice.notes
      };
    }).filter(Boolean) as Product[];

    console.log('🛒 CATALOGUE PERSONNALISÉ - Produits mappés:', mappedProducts.length);
    return mappedProducts;

  } catch (error) {
    console.error("Erreur lors du chargement du catalogue personnalisé:", error);
    throw error;
  }
};