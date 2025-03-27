
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

/**
 * Ajoute une nouvelle catégorie
 */
export const addCategory = async ({ name, translation }: { name: string; translation: string }) => {
  try {
    const { data, error } = await supabase
      .from("categories")
      .insert([
        { name, translation }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erreur lors de l'ajout de la catégorie:", error);
    throw error;
  }
};

/**
 * Met à jour une catégorie existante
 */
export const updateCategory = async ({ 
  originalName, 
  name, 
  translation 
}: { 
  originalName: string; 
  name: string; 
  translation: string 
}) => {
  try {
    const { data, error } = await supabase
      .from("categories")
      .update({ name, translation })
      .eq("name", originalName)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la catégorie:", error);
    throw error;
  }
};

/**
 * Supprime une catégorie
 */
export const deleteCategory = async ({ name }: { name: string }) => {
  try {
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("name", name);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Erreur lors de la suppression de la catégorie:", error);
    throw error;
  }
};

/**
 * Ajoute une nouvelle marque
 */
export const addBrand = async ({ name, translation }: { name: string; translation: string }) => {
  try {
    const { data, error } = await supabase
      .from("brands")
      .insert([
        { name, translation }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erreur lors de l'ajout de la marque:", error);
    throw error;
  }
};

/**
 * Met à jour une marque existante
 */
export const updateBrand = async ({ 
  originalName, 
  name, 
  translation 
}: { 
  originalName: string; 
  name: string; 
  translation: string 
}) => {
  try {
    const { data, error } = await supabase
      .from("brands")
      .update({ name, translation })
      .eq("name", originalName)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la marque:", error);
    throw error;
  }
};

/**
 * Supprime une marque
 */
export const deleteBrand = async ({ name }: { name: string }) => {
  try {
    const { error } = await supabase
      .from("brands")
      .delete()
      .eq("name", name);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Erreur lors de la suppression de la marque:", error);
    throw error;
  }
};

/**
 * Ajoute un nouveau produit
 */
export const addProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> => {
  try {
    // Transformation des propriétés pour correspondre au schéma de la table
    const productData = {
      name: product.name,
      description: product.description,
      category: product.category,
      brand: product.brand,
      price: product.price,
      monthly_price: product.monthly_price,
      is_parent: product.is_parent || false,
      parent_id: product.parent_id || null,
      is_variation: product.is_variation || false,
      variation_attributes: product.variation_attributes || {},
      stock: product.stock || 0,
      active: product.active !== undefined ? product.active : true,
      specifications: product.specifications || {},
      attributes: product.attributes || {}
    };

    const { data, error } = await supabase
      .from("products")
      .insert([productData])
      .select()
      .single();

    if (error) throw error;
    
    return {
      ...data,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error("Erreur lors de l'ajout du produit:", error);
    throw error;
  }
};

/**
 * Met à jour un produit existant
 */
export const updateProduct = async (id: string, product: Partial<Product>): Promise<Product> => {
  try {
    // Transformation des propriétés pour correspondre au schéma de la table
    const productData: any = { ...product };
    
    // Suppression des propriétés qui ne sont pas dans la table
    delete productData.createdAt;
    delete productData.updatedAt;
    delete productData.variants;
    delete productData.variant_combination_prices;
    
    const { data, error } = await supabase
      .from("products")
      .update(productData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    
    return {
      ...data,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error("Erreur lors de la mise à jour du produit:", error);
    throw error;
  }
};

/**
 * Supprime un produit
 */
export const deleteProduct = async (id: string): Promise<boolean> => {
  try {
    // D'abord supprimer les prix de variantes associés
    const { error: variantPricesError } = await supabase
      .from("product_variant_prices")
      .delete()
      .eq("product_id", id);

    if (variantPricesError) {
      console.error("Erreur lors de la suppression des prix de variantes:", variantPricesError);
    }

    // Ensuite supprimer le produit
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Erreur lors de la suppression du produit:", error);
    throw error;
  }
};

/**
 * Télécharge une image pour un produit
 */
export const uploadProductImage = async (file: File, productId: string, isMainImage: boolean = false): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${productId}${isMainImage ? '-main' : `-${Date.now()}`}.${fileExt}`;
    const filePath = `product-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('products')
      .getPublicUrl(filePath);

    const imageUrl = urlData.publicUrl;

    // Si c'est l'image principale, mettre à jour le produit
    if (isMainImage) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: imageUrl })
        .eq('id', productId);

      if (updateError) throw updateError;
    }

    return imageUrl;
  } catch (error) {
    console.error("Erreur lors du téléchargement de l'image:", error);
    throw error;
  }
};

/**
 * Convertit un produit normal en produit parent (avec variantes)
 */
export const convertProductToParent = async (id: string, variationAttributes: any = {}): Promise<Product> => {
  try {
    const { data, error } = await supabase
      .from("products")
      .update({
        is_parent: true,
        variation_attributes: variationAttributes
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    
    return {
      ...data,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error("Erreur lors de la conversion du produit en produit parent:", error);
    throw error;
  }
};
