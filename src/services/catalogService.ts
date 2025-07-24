import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/catalog";
import { getCurrentUserCompanyId } from "@/services/multiTenantService";

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
  const { data, error } = await supabase
    .from("brands")
    .insert(brandData)
    .select()
    .single();

  if (error) throw error;
  return data;
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
  const { data, error } = await supabase
    .from("categories")
    .insert(categoryData)
    .select()
    .single();

  if (error) throw error;
  return data;
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

export const deleteCategory = async (categoryName: string) => {
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("name", categoryName);

  if (error) throw error;
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
