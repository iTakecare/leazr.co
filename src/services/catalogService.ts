
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/catalog";

export const getProducts = async (options?: { includeAdminOnly?: boolean }) => {
  console.log("📦 getProducts - Démarrage avec options:", options);
  
  let query = supabase
    .from("products")
    .select(`
      *,
      brands!inner(id, name, translation),
      categories!inner(id, name, translation)
    `)
    .eq("active", true)
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
  const mappedProducts = data?.map(product => ({
    ...product,
    brand: product.brands?.name || product.brand || '',
    category: product.categories?.name || product.category || '',
    brand_id: product.brand_id,
    category_id: product.category_id
  })) || [];

  console.log("📦 getProducts - Produits mappés:", mappedProducts.length);
  return mappedProducts as Product[];
};

export const getProductById = async (productId: string): Promise<Product | null> => {
  console.log("📦 getProductById - Recherche du produit:", productId);
  
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      brands(id, name, translation),
      categories(id, name, translation)
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

  // Mapper les données pour utiliser les bons noms de marques et catégories
  const mappedProduct = {
    ...data,
    brand: data.brands?.name || data.brand || '',
    category: data.categories?.name || data.category || '',
    brand_id: data.brand_id,
    category_id: data.category_id
  };

  console.log("📦 getProductById - Produit mappé:", {
    name: mappedProduct.name,
    brand: mappedProduct.brand,
    category: mappedProduct.category,
    brand_id: mappedProduct.brand_id,
    category_id: mappedProduct.category_id
  });

  return mappedProduct as Product;
};

export const getPublicProducts = async () => {
  console.log("📦 getPublicProducts - Démarrage");
  
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      brands!inner(id, name, translation),
      categories!inner(id, name, translation)
    `)
    .eq("active", true)
    .eq("admin_only", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("📦 getPublicProducts - Erreur:", error);
    throw error;
  }

  console.log("📦 getPublicProducts - Données brutes:", data?.length, "produits");

  // Mapper les données pour utiliser les bons noms de marques et catégories
  const mappedProducts = data?.map(product => ({
    ...product,
    brand: product.brands?.name || product.brand || '',
    category: product.categories?.name || product.category || '',
    brand_id: product.brand_id,
    category_id: product.category_id
  })) || [];

  console.log("📦 getPublicProducts - Produits mappés:", mappedProducts.length);
  return mappedProducts as Product[];
};

export const getBrands = async () => {
  console.log("📦 getBrands - Récupération des marques");
  
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("📦 getBrands - Erreur:", error);
    throw error;
  }

  console.log("📦 getBrands - Marques récupérées:", data?.length);
  return data || [];
};

export const getCategories = async () => {
  console.log("📦 getCategories - Récupération des catégories");
  
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("📦 getCategories - Erreur:", error);
    throw error;
  }

  console.log("📦 getCategories - Catégories récupérées:", data?.length);
  return data || [];
};
