
import { supabase } from "@/integrations/supabase/client";
import { Product, ProductAttributes } from "@/types/catalog";

/**
 * Récupère tous les produits avec leurs variantes et prix de variantes
 */
export const getProducts = async (): Promise<Product[]> => {
  try {
    // Récupérer tous les produits
    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (productsError) throw productsError;

    // Récupérer tous les prix de variantes
    const { data: variantPricesData, error: variantPricesError } = await supabase
      .from("product_variant_prices")
      .select("*");

    if (variantPricesError) throw variantPricesError;

    // Associer les prix de variantes aux produits correspondants
    const productsWithVariants = productsData.map(product => {
      // Filtrer les prix de variantes pour ce produit
      const productVariantPrices = variantPricesData.filter(
        price => price.product_id === product.id
      );

      console.log(`Product ${product.name}: Found ${productVariantPrices.length} variant prices`);

      // Déterminer si c'est un produit parent
      const isParent = 
        product.is_parent || 
        productVariantPrices.length > 0 || 
        (product.variation_attributes && Object.keys(product.variation_attributes).length > 0);

      return {
        ...product,
        variant_combination_prices: productVariantPrices,
        is_parent: isParent,
        createdAt: product.created_at,
        updatedAt: product.updated_at
      };
    });

    return productsWithVariants;
  } catch (error) {
    console.error("Erreur lors de la récupération des produits:", error);
    throw error;
  }
};

/**
 * Récupère un produit par son ID avec ses variantes et prix
 */
export const getProductById = async (id: string): Promise<Product> => {
  try {
    // Récupérer le produit de base
    const { data: product, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    // Récupérer les variantes de ce produit (s'il est parent)
    const { data: variants, error: variantsError } = await supabase
      .from("products")
      .select("*")
      .eq("parent_id", id);

    // Récupérer les prix de variantes pour ce produit
    const { data: variantPrices, error: variantPricesError } = await supabase
      .from("product_variant_prices")
      .select("*")
      .eq("product_id", id);

    if (variantsError) console.error("Erreur lors de la récupération des variantes:", variantsError);
    if (variantPricesError) console.error("Erreur lors de la récupération des prix de variantes:", variantPricesError);

    // Déterminer si c'est un produit parent
    const isParent = 
      product.is_parent || 
      (variants && variants.length > 0) || 
      (variantPrices && variantPrices.length > 0) ||
      (product.variation_attributes && Object.keys(product.variation_attributes).length > 0);

    // Construire l'objet produit avec toutes ses données associées
    return {
      ...product,
      variants: variants || [],
      variant_combination_prices: variantPrices || [],
      is_parent: isParent,
      createdAt: product.created_at,
      updatedAt: product.updated_at
    };
  } catch (error) {
    console.error("Erreur lors de la récupération du produit:", error);
    throw error;
  }
};

/**
 * Recherche une variante compatible avec les attributs sélectionnés
 */
export const findVariantByAttributes = async (
  productId: string,
  selectedAttributes: ProductAttributes
): Promise<Product | null> => {
  try {
    const { data: product } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    // Vérifier les prix de variantes
    const { data: variantPrices } = await supabase
      .from("product_variant_prices")
      .select("*")
      .eq("product_id", productId);

    if (variantPrices && variantPrices.length > 0) {
      // Chercher une combinaison qui correspond exactement aux attributs sélectionnés
      const matchingPrice = variantPrices.find(price => {
        if (!price.attributes) return false;
        
        // Vérifier que tous les attributs sélectionnés correspondent
        return Object.entries(selectedAttributes).every(([key, value]) => 
          price.attributes[key] !== undefined && 
          String(price.attributes[key]).toLowerCase() === String(value).toLowerCase()
        );
      });

      if (matchingPrice) {
        // Créer un produit avec les informations de prix
        return {
          ...product,
          price: matchingPrice.price,
          monthly_price: matchingPrice.monthly_price,
          selected_attributes: selectedAttributes
        };
      }
    }

    // Chercher des variantes produits
    const { data: variants } = await supabase
      .from("products")
      .select("*")
      .eq("parent_id", productId);

    if (variants && variants.length > 0) {
      // Chercher une variante qui correspond aux attributs sélectionnés
      const matchingVariant = variants.find(variant => {
        if (!variant.attributes) return false;
        
        return Object.entries(selectedAttributes).every(([key, value]) => 
          variant.attributes[key] !== undefined &&
          String(variant.attributes[key]).toLowerCase() === String(value).toLowerCase()
        );
      });

      if (matchingVariant) {
        return matchingVariant;
      }
    }

    return null;
  } catch (error) {
    console.error("Erreur lors de la recherche de variante:", error);
    return null;
  }
};

/**
 * Récupère toutes les catégories disponibles
 */
export const getCategories = async () => {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Erreur lors de la récupération des catégories:", error);
    return [];
  }
};

/**
 * Récupère toutes les marques disponibles
 */
export const getBrands = async () => {
  try {
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Erreur lors de la récupération des marques:", error);
    return [];
  }
};
