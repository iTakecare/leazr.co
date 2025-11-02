import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/catalog";
import { getCurrentUserCompanyId } from "@/services/multiTenantService";
import { 
  EnvironmentalApiResponse, 
  CategoryWithEnvironmental, 
  ProductCO2Response 
} from "@/types/environmental";

export const getProducts = async (options?: { includeAdminOnly?: boolean }) => {
  console.log("📦 getProducts - Démarrage avec options:", options);
  
  try {
    // Récupérer le company_id via le service multi-tenant
    const companyId = await getCurrentUserCompanyId();
    console.log("📦 getProducts - Company ID récupéré:", companyId);
    
    let query = supabase
      .from("products")
      .select(`
        *,
        brands!inner(id, name, translation),
        categories!inner(id, name, translation),
        product_variant_prices!left(
          id,
          attributes,
          price,
          monthly_price,
          stock
        )
      `)
      .eq("active", true)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (!options?.includeAdminOnly) {
      query = query.eq("admin_only", false);
    }

    const { data, error } = await query;

    if (error) {
      console.error("📦 getProducts - Erreur:", error);
      throw error;
    }

    console.log("📦 getProducts - Données brutes:", data?.length, "produits");

    // Mapper les données pour utiliser les bons noms de marques et catégories
    const mappedProducts = data?.map(product => {
      // Traiter les variant_combination_prices
      const variantPrices = product.product_variant_prices || [];
      console.log(`📦 Product ${product.name} - Variant prices:`, variantPrices.length);
      
      return {
        ...product,
        brand: product.brands?.name || product.brand || '',
        category: product.categories?.name || product.category || '',
        brand_id: product.brand_id,
        category_id: product.category_id,
        variant_combination_prices: variantPrices,
        createdAt: product.created_at || new Date(),
        updatedAt: product.updated_at || new Date()
      };
    }) || [];

    console.log("📦 getProducts - Produits mappés:", mappedProducts.length);
    return mappedProducts as Product[];
  } catch (companyError) {
    console.error("📦 getProducts - Erreur lors de la récupération du company_id:", companyError);
    throw new Error("Impossible de récupérer les produits: " + companyError.message);
  }
};

export const getProductById = async (productId: string): Promise<Product | null> => {
  console.log("📦 getProductById - Recherche du produit:", productId);
  
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      brands(id, name, translation),
      categories(id, name, translation),
      product_variant_prices(
        id,
        attributes,
        price,
        monthly_price,
        stock
      )
    `)
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    console.error("📦 getProductById - Erreur:", error);
    throw error;
  }

  if (!data) {
    console.log("📦 getProductById - Produit non trouvé");
    return null;
  }

  console.log("📦 getProductById - Produit trouvé:", data.name);
  console.log("📦 getProductById - Brand data:", data.brands);
  console.log("📦 getProductById - Category data:", data.categories);
  console.log("📦 getProductById - Variant prices:", data.product_variant_prices?.length || 0);

  // Mapper les données pour utiliser les bons noms de marques et catégories
  const mappedProduct = {
    ...data,
    brand: data.brands?.name || data.brand || '',
    category: data.categories?.name || data.category || '',
    brand_id: data.brand_id,
    category_id: data.category_id,
    variant_combination_prices: data.product_variant_prices || [],
    createdAt: data.created_at || new Date(),
    updatedAt: data.updated_at || new Date()
  };

  console.log("📦 getProductById - Produit mappé:", {
    name: mappedProduct.name,
    brand: mappedProduct.brand,
    category: mappedProduct.category,
    brand_id: mappedProduct.brand_id,
    category_id: mappedProduct.category_id,
    variant_prices_count: mappedProduct.variant_combination_prices?.length || 0
  });

  return mappedProduct as Product;
};

export const getPublicProducts = async (companyId: string): Promise<Product[]> => {
  console.log('🏪 CATALOG SERVICE - Getting public products for company:', companyId);

  if (!companyId) {
    console.error('🏪 CATALOG SERVICE - No company ID provided');
    throw new Error("Company ID is required for public products");
  }

  try {
    // Utiliser la fonction RPC sécurisée pour contourner les problèmes RLS
    const { data, error } = await supabase
      .rpc('get_public_products_by_company', { 
        p_company_id: companyId 
      });

    if (error) {
      console.error('🏪 CATALOG SERVICE - Error fetching public products:', error);
      throw error;
    }

    console.log('🏪 CATALOG SERVICE - Raw products data:', data);

    if (!data || data.length === 0) {
      console.log('🏪 CATALOG SERVICE - No products found for company:', companyId);
      return [];
    }

    // Mapper les données pour utiliser le bon format Product
    const mappedProducts = data.map(product => {
      console.log(`🏪 Product ${product.name} - variant_combination_prices:`, product.variant_combination_prices);
      
      return {
        ...product,
        stock: product.stock_quantity || 0,
        active: true,
        variant_combination_prices: product.variant_combination_prices || [],
        createdAt: product.created_at || new Date(),
        updatedAt: product.updated_at || new Date()
      };
    });

    console.log('🏪 CATALOG SERVICE - Mapped products:', mappedProducts.length);
    return mappedProducts as Product[];

  } catch (error) {
    console.error('🏪 CATALOG SERVICE - Error in getPublicProducts:', error);
    throw error;
  }
};

export const getBrands = async () => {
  console.log("📦 getBrands - Récupération des marques");
  
  try {
    const companyId = await getCurrentUserCompanyId();
    console.log("📦 getBrands - Company ID récupéré:", companyId);
    
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .eq("company_id", companyId)
      .order("name", { ascending: true });

    if (error) {
      console.error("📦 getBrands - Erreur:", error);
      throw error;
    }

    console.log("📦 getBrands - Marques récupérées:", data?.length);
    return data || [];
  } catch (companyError) {
    console.error("📦 getBrands - Erreur lors de la récupération du company_id:", companyError);
    throw new Error("Impossible de récupérer les marques: " + companyError.message);
  }
};

export const getCategories = async () => {
  console.log("📦 getCategories - Récupération des catégories");
  
  try {
    const companyId = await getCurrentUserCompanyId();
    console.log("📦 getCategories - Company ID récupéré:", companyId);
    
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("company_id", companyId)
      .order("name", { ascending: true });

    if (error) {
      console.error("📦 getCategories - Erreur:", error);
      throw error;
    }

    console.log("📦 getCategories - Catégories récupérées:", data?.length);
    return data || [];
  } catch (companyError) {
    console.error("📦 getCategories - Erreur lors de la récupération du company_id:", companyError);
    throw new Error("Impossible de récupérer les catégories: " + companyError.message);
  }
};

export const addBrand = async (brandData: { name: string; translation: string }) => {
  try {
    const companyId = await getCurrentUserCompanyId();
    console.log("📦 addBrand - Company ID récupéré:", companyId);
    
    const { data, error } = await supabase
      .from("brands")
      .insert({
        ...brandData,
        company_id: companyId
      })
      .select()
      .single();

    if (error) {
      console.error("📦 addBrand - Erreur:", error);
      throw error;
    }

    console.log("📦 addBrand - Marque ajoutée:", data);
    return data;
  } catch (companyError) {
    console.error("📦 addBrand - Erreur lors de l'ajout:", companyError);
    throw new Error("Impossible d'ajouter la marque: " + companyError.message);
  }
};

export const updateBrand = async ({ originalName, name, translation }: { originalName: string; name: string; translation: string }) => {
  const { data, error } = await supabase
    .from("brands")
    .update({ name, translation })
    .eq("name", originalName)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteBrand = async ({ name }: { name: string }) => {
  const { error } = await supabase
    .from("brands")
    .delete()
    .eq("name", name);

  if (error) throw error;
};

export const addCategory = async (categoryData: { name: string; translation: string }) => {
  try {
    const companyId = await getCurrentUserCompanyId();
    console.log("📦 addCategory - Company ID récupéré:", companyId);
    
    const { data, error } = await supabase
      .from("categories")
      .insert({
        ...categoryData,
        company_id: companyId
      })
      .select()
      .single();

    if (error) {
      console.error("📦 addCategory - Erreur:", error);
      throw error;
    }

    console.log("📦 addCategory - Catégorie ajoutée:", data);
    return data;
  } catch (companyError) {
    console.error("📦 addCategory - Erreur lors de l'ajout:", companyError);
    throw new Error("Impossible d'ajouter la catégorie: " + companyError.message);
  }
};

export const updateCategory = async (id: string, categoryData: { name: string; translation: string }) => {
  const { data, error } = await supabase
    .from("categories")
    .update({ name: categoryData.name, translation: categoryData.translation })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteCategory = async (categoryId: string) => {
  try {
    // Check if the category is used by any products
    const { data: products, error: checkError } = await supabase
      .from("products")
      .select("id")
      .eq("category_id", categoryId)
      .limit(1);

    if (checkError) {
      console.error("Error checking category usage:", checkError);
      throw new Error("Impossible de vérifier l'utilisation de la catégorie");
    }

    if (products && products.length > 0) {
      throw new Error("Cette catégorie ne peut pas être supprimée car elle est utilisée par des produits");
    }

    // Delete the category
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId);

    if (error) {
      console.error("Error deleting category:", error);
      if (error.code === '23503') {
        throw new Error("Cette catégorie ne peut pas être supprimée car elle est utilisée par d'autres éléments");
      }
      throw new Error("Erreur lors de la suppression de la catégorie");
    }
  } catch (error) {
    console.error("Error in deleteCategory:", error);
    throw error;
  }
};

export const createProduct = async (productData: any) => {
  const { data, error } = await supabase
    .from("products")
    .insert(productData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateProduct = async (productId: string, productData: any) => {
  const { data, error } = await supabase
    .from("products")
    .update(productData)
    .eq("id", productId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteProduct = async (productId: string) => {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) throw error;
};

export const uploadProductImage = async (imageFile: File, productId: string, isMain?: boolean | string) => {
  // This would typically upload to storage and return the URL
  // For now, just return a string URL
  return `mock-image-url-${productId}-${isMain ? 'main' : 'additional'}`;
};

export const findVariantByAttributes = async (productId: string, attributes: any) => {
  // Find variant implementation
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("parent_id", productId)
    .single();

  if (error) throw error;
  return data;
};

export const convertProductToParent = async (productId: string, updateData: any) => {
  const { data, error } = await supabase
    .from("products")
    .update({ ...updateData, is_parent: true })
    .eq("id", productId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ===== Environmental Data Management =====

/**
 * Get the active API key for the current company
 */
const getActiveApiKey = async (companyId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('api_keys')
    .select('api_key')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.error("❌ No active API key found for company:", companyId, error);
    return null;
  }

  return data.api_key;
};

/**
 * Get environmental data for all categories using the catalog-api Edge Function
 */
export const getEnvironmentalData = async (companySlug: string): Promise<EnvironmentalApiResponse> => {
  console.log("🌱 getEnvironmentalData - Fetching environmental data for company:", companySlug);
  
  try {
    // Get company ID from slug
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', companySlug)
      .single();

    if (companyError || !company) {
      throw new Error(`Company not found for slug: ${companySlug}`);
    }

    // Get active API key
    const apiKey = await getActiveApiKey(company.id);
    if (!apiKey) {
      throw new Error('No active API key found. Please create one in the API settings.');
    }

    // Call edge function with correct syntax
    const response = await fetch(
      `https://cifbetjefyfocafanlhv.supabase.co/functions/v1/catalog-api/v1/${companySlug}/environmental/categories`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-api-key': apiKey,
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("🌱 getEnvironmentalData - Error:", error);
      throw new Error(error.error || 'Failed to fetch environmental data');
    }

    const data = await response.json();
    console.log("🌱 getEnvironmentalData - Success:", data);
    return data;
  } catch (error) {
    console.error("🌱 getEnvironmentalData - Exception:", error);
    throw error;
  }
};

/**
 * Get categories with environmental data using the catalog-api Edge Function
 */
export const getCategoriesWithEnvironmentalData = async (companySlug: string): Promise<CategoryWithEnvironmental[]> => {
  console.log("🌱 getCategoriesWithEnvironmentalData - Fetching categories with CO2 data for company:", companySlug);
  
  try {
    // Get company ID from slug
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', companySlug)
      .single();

    if (companyError || !company) {
      throw new Error(`Company not found for slug: ${companySlug}`);
    }

    // Get active API key
    const apiKey = await getActiveApiKey(company.id);
    if (!apiKey) {
      throw new Error('No active API key found. Please create one in the API settings.');
    }

    // Call edge function with correct syntax
    const response = await fetch(
      `https://cifbetjefyfocafanlhv.supabase.co/functions/v1/catalog-api/v1/${companySlug}/categories`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-api-key': apiKey,
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("🌱 getCategoriesWithEnvironmentalData - Error:", error);
      throw new Error(error.error || 'Failed to fetch categories');
    }

    const data = await response.json();
    console.log("🌱 getCategoriesWithEnvironmentalData - Success:", data?.categories?.length, "categories");
    return data?.categories || [];
  } catch (error) {
    console.error("🌱 getCategoriesWithEnvironmentalData - Exception:", error);
    throw error;
  }
};

/**
 * Get CO2 data for a specific product using the catalog-api Edge Function
 */
export const getProductCO2Data = async (companySlug: string, productId: string): Promise<ProductCO2Response> => {
  console.log("🌱 getProductCO2Data - Fetching CO2 data for product:", productId);
  
  try {
    // Get company ID from slug
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', companySlug)
      .single();

    if (companyError || !company) {
      throw new Error(`Company not found for slug: ${companySlug}`);
    }

    // Get active API key
    const apiKey = await getActiveApiKey(company.id);
    if (!apiKey) {
      throw new Error('No active API key found. Please create one in the API settings.');
    }

    // Call edge function with correct syntax
    const response = await fetch(
      `https://cifbetjefyfocafanlhv.supabase.co/functions/v1/catalog-api/v1/${companySlug}/products/${productId}/co2`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-api-key': apiKey,
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("🌱 getProductCO2Data - Error:", error);
      throw new Error(error.error || 'Failed to fetch product CO2 data');
    }

    const data = await response.json();
    console.log("🌱 getProductCO2Data - Success:", data);
    return data?.product;
  } catch (error) {
    console.error("🌱 getProductCO2Data - Exception:", error);
    throw error;
  }
};

// ===== Client Custom Prices Management =====

// Récupérer les prix personnalisés d'un client
export const getClientCustomPrices = async (clientId: string) => {
  const { data, error } = await supabase
    .from('client_custom_prices')
    .select(`
      *,
      products (
        id,
        name,
        price,
        monthly_price,
        image_url,
        brands (name, translation),
        categories (name, translation)
      )
    `)
    .eq('client_id', clientId);

  if (error) throw error;
  return data;
};

// Ajouter un prix personnalisé pour un produit
export const addClientCustomPrice = async (
  clientId: string, 
  productId: string, 
  priceData: {
    margin_rate?: number;
    negotiated_monthly_price?: number;
    custom_purchase_price?: number;
  }
) => {
  const companyId = await getCurrentUserCompanyId();
  if (!companyId) {
    throw new Error('Company ID not found');
  }

  const { data, error } = await supabase
    .from('client_custom_prices')
    .insert({
      client_id: clientId,
      product_id: productId,
      company_id: companyId,
      ...priceData
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Mettre à jour un prix personnalisé
export const updateClientCustomPrice = async (
  customPriceId: string, 
  priceData: {
    margin_rate?: number;
    negotiated_monthly_price?: number;
    custom_purchase_price?: number;
  }
) => {
  const { data, error } = await supabase
    .from('client_custom_prices')
    .update(priceData)
    .eq('id', customPriceId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Supprimer un prix personnalisé
export const deleteClientCustomPrice = async (customPriceId: string) => {
  const { error } = await supabase
    .from('client_custom_prices')
    .delete()
    .eq('id', customPriceId);

  if (error) throw error;
};

// Ajouter plusieurs produits en une fois au catalogue personnalisé
export const addMultipleProductsToCustomCatalog = async (
  clientId: string, 
  productIds: string[], 
  defaultMarginRate: number = 15
) => {
  const companyId = await getCurrentUserCompanyId();
  if (!companyId) {
    throw new Error('Company ID not found');
  }

  const inserts = productIds.map(productId => ({
    client_id: clientId,
    product_id: productId,
    company_id: companyId,
    margin_rate: defaultMarginRate,
  }));

  const { data, error } = await supabase
    .from('client_custom_prices')
    .insert(inserts)
    .select();

  if (error) throw error;
  return data;
};

// Ajouter un prix personnalisé pour un variant
export const addClientCustomVariantPrice = async (
  clientId: string,
  variantPriceId: string,
  priceData: {
    margin_rate?: number;
    negotiated_monthly_price?: number;
    custom_purchase_price?: number;
  }
) => {
  const companyId = await getCurrentUserCompanyId();
  if (!companyId) {
    throw new Error('Company ID not found');
  }

  const { data, error } = await supabase
    .from('client_custom_variant_prices')
    .insert({
      client_id: clientId,
      variant_price_id: variantPriceId,
      company_id: companyId,
      ...priceData
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};
