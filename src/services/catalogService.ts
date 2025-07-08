import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/catalog";
import { getCurrentUserCompanyId } from "@/services/multiTenantService";

/**
 * Récupère tous les produits avec leurs variantes et prix de variantes
 */
export const getProducts = async (includeAdminOnly?: boolean | { includeAdminOnly?: boolean }) => {
  try {
    console.log("🛒 CATALOG - Début getProducts");
    
    // Normalize the parameter
    let showAdminOnly = false;
    if (typeof includeAdminOnly === 'boolean') {
      showAdminOnly = includeAdminOnly;
    } else if (includeAdminOnly && typeof includeAdminOnly === 'object' && 'includeAdminOnly' in includeAdminOnly) {
      showAdminOnly = !!includeAdminOnly.includeAdminOnly;
    }

    // Récupérer le company_id de l'utilisateur connecté pour un filtrage explicite
    const company_id = await getCurrentUserCompanyId();
    console.log("🛒 CATALOG - Company ID récupéré:", company_id);

    // Récupérer les produits avec filtrage explicite par company_id
    let query = supabase
      .from("products")
      .select("*")
      .eq("company_id", company_id)
      .order("created_at", { ascending: false });
    
    // Filter out admin_only products unless explicitly requested
    if (!showAdminOnly) {
      query = query.or('admin_only.is.null,admin_only.eq.false');
    }
    
    const { data: productsData, error: productsError } = await query;
    
    if (productsError) throw productsError;
    
    console.log(`🛒 CATALOG - Produits trouvés pour company ${company_id}:`, productsData?.length || 0);
    
    // Récupérer tous les prix de variantes
    const { data: variantPricesData, error: variantPricesError } = await supabase
      .from("product_variant_prices")
      .select("*");
    
    if (variantPricesError) throw variantPricesError;
    
    // Associer les prix de variantes aux produits correspondants
    const productsWithVariants = productsData.map((product) => {
      // Filtrer les prix de variantes pour ce produit
      const productVariantPrices = variantPricesData.filter((price) => price.product_id === product.id);
      console.log(`Product ${product.name}: Found ${productVariantPrices.length} variant prices`);
      
      // Déterminer si c'est un produit parent
      const isParent = product.is_parent || 
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
export const getProductById = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching product:', error);
      throw new Error(error.message);
    }
    
    // Now fetch variant prices for this product
    const { data: variantPrices, error: variantError } = await supabase
      .from('product_variant_prices')
      .select('*')
      .eq('product_id', id);
    
    if (variantError) {
      console.error('Error fetching variant prices:', variantError);
    }
    
    // Add variant prices to the product
    return {
      ...data,
      variant_combination_prices: variantPrices || []
    };
  } catch (error) {
    console.error('Error in getProductById:', error);
    throw error;
  }
};

/**
 * Recherche une variante compatible avec les attributs sélectionnés
 */
export const findVariantByAttributes = async (productId: string, selectedAttributes: Record<string, string>) => {
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
      const matchingPrice = variantPrices.find((price) => {
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
      const matchingVariant = variants.find((variant) => {
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
 * Récupère toutes les catégories disponibles avec isolation par entreprise
 */
export const getCategories = async () => {
  try {
    console.log("🏷️ CATALOG - Début getCategories");
    
    // Récupérer le company_id de l'utilisateur connecté
    const company_id = await getCurrentUserCompanyId();
    console.log("🏷️ CATALOG - Company ID récupéré:", company_id);
    
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('company_id', company_id)
      .order('name');
    
    if (error) {
      console.error('Error fetching categories:', error);
      throw new Error(error.message);
    }
    
    console.log(`🏷️ CATALOG - Catégories trouvées pour company ${company_id}:`, data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('Error in getCategories:', error);
    throw error;
  }
};

/**
 * Récupère toutes les marques disponibles avec isolation par entreprise
 */
export const getBrands = async () => {
  try {
    console.log("🏷️ CATALOG - Début getBrands");
    
    // Récupérer le company_id de l'utilisateur connecté
    const company_id = await getCurrentUserCompanyId();
    console.log("🏷️ CATALOG - Company ID récupéré:", company_id);
    
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('company_id', company_id)
      .order('name');
    
    if (error) {
      console.error('Error fetching brands:', error);
      throw new Error(error.message);
    }
    
    console.log(`🏷️ CATALOG - Marques trouvées pour company ${company_id}:`, data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('Error in getBrands:', error);
    throw error;
  }
};

/**
 * Ajoute une nouvelle catégorie avec isolation par entreprise
 */
export const addCategory = async (category: { name: string; translation: string }) => {
  try {
    // Récupérer le company_id de l'utilisateur connecté
    const company_id = await getCurrentUserCompanyId();
    
    const categoryWithCompany = {
      ...category,
      company_id: company_id
    };
    
    const { data, error } = await supabase
      .from('categories')
      .insert(categoryWithCompany)
      .select()
      .single();
    
    if (error) {
      console.error('Error adding category:', error);
      throw new Error(error.message);
    }
    
    return data;
  } catch (error) {
    console.error('Error in addCategory:', error);
    throw error;
  }
};

/**
 * Met à jour une catégorie existante
 */
export const updateCategory = async ({ originalName, name, translation }: { originalName: string; name: string; translation: string }) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .update({ name, translation })
      .eq('name', originalName)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating category:', error);
      throw new Error(error.message);
    }
    
    return data;
  } catch (error) {
    console.error('Error in updateCategory:', error);
    throw error;
  }
};

/**
 * Supprime une catégorie
 */
export const deleteCategory = async ({ name }: { name: string }) => {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('name', name);
    
    if (error) {
      console.error('Error deleting category:', error);
      throw new Error(error.message);
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteCategory:', error);
    throw error;
  }
};

/**
 * Ajoute une nouvelle marque avec isolation par entreprise
 */
export const addBrand = async (brand: { name: string; translation: string }) => {
  try {
    // Récupérer le company_id de l'utilisateur connecté
    const company_id = await getCurrentUserCompanyId();
    
    const brandWithCompany = {
      ...brand,
      company_id: company_id
    };
    
    const { data, error } = await supabase
      .from('brands')
      .insert(brandWithCompany)
      .select()
      .single();
    
    if (error) {
      console.error('Error adding brand:', error);
      throw new Error(error.message);
    }
    
    return data;
  } catch (error) {
    console.error('Error in addBrand:', error);
    throw error;
  }
};

/**
 * Met à jour une marque existante
 */
export const updateBrand = async ({ originalName, name, translation }: { originalName: string; name: string; translation: string }) => {
  try {
    const { data, error } = await supabase
      .from('brands')
      .update({ name, translation })
      .eq('name', originalName)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating brand:', error);
      throw new Error(error.message);
    }
    
    return data;
  } catch (error) {
    console.error('Error in updateBrand:', error);
    throw error;
  }
};

/**
 * Supprime une marque
 */
export const deleteBrand = async ({ name }: { name: string }) => {
  try {
    const { error } = await supabase
      .from('brands')
      .delete()
      .eq('name', name);
    
    if (error) {
      console.error('Error deleting brand:', error);
      throw new Error(error.message);
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteBrand:', error);
    throw error;
  }
};

/**
 * Ajoute un nouveau produit
 */
export const addProduct = async (product: Partial<Product>) => {
  try {
    console.log("=== DEBUG: Adding product ===");
    console.log("Input product:", product);
    
    // Récupérer le company_id de l'utilisateur connecté
    const company_id = await getCurrentUserCompanyId();
    console.log("Company ID récupéré:", company_id);
    
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
      attributes: product.attributes || {},
      admin_only: product.admin_only || false,
      company_id: company_id
    };
    
    console.log("Transformed product data:", productData);
    
    const { data, error } = await supabase
      .from("products")
      .insert([productData])
      .select()
      .single();
    
    console.log("Supabase response - data:", data);
    console.log("Supabase response - error:", error);
    
    if (error) {
      console.error("Supabase error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }
    
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
 * Crée un nouveau produit
 */
export const createProduct = async (productData: Partial<Product>): Promise<Product> => {
  try {
    // Récupérer le company_id de l'utilisateur connecté
    const company_id = await getCurrentUserCompanyId();
    
    // Ajouter le company_id aux données du produit
    const productWithCompany = {
      ...productData,
      company_id: company_id
    };
    
    const { data, error } = await supabase
      .from("products")
      .insert([productWithCompany])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating product:', error);
      throw new Error(error.message);
    }
    
    return data;
  } catch (error: any) {
    console.error('Error in createProduct:', error);
    throw error;
  }
};

/**
 * Met à jour un produit existant
 */
export const updateProduct = async (id: string, product: Partial<Product>) => {
  try {
    // Vérifier d'abord si le produit existe
    const { data: existingProduct, error: checkError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error checking product existence:', checkError);
      throw new Error(checkError.message);
    }
    
    if (!existingProduct) {
      console.error(`No product found with ID: ${id}`);
      throw new Error(`Product with ID ${id} not found`);
    }
    
    // Enregistrer la valeur admin_only dans une variable séparée pour le debugging
    const adminOnly = product.admin_only !== undefined ? product.admin_only : existingProduct.admin_only;
    console.log(`Updating product ${id} with admin_only:`, adminOnly);
    
    // S'assurer que admin_only est inclus dans les données de mise à jour
    const updatedData = {
      ...product,
      admin_only: adminOnly
    };
    
    // Procéder à la mise à jour
    const { error } = await supabase
      .from('products')
      .update(updatedData)
      .eq('id', id);
    
    if (error) {
      console.error('Error updating product:', error);
      throw new Error(error.message);
    }
    
    // Récupérer le produit mis à jour
    const { data: updatedProduct, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();
      
    if (fetchError) {
      console.error('Error fetching updated product:', fetchError);
      // On ne lance pas d'erreur ici car la mise à jour a réussi
      // mais plutôt on retourne le produit original avec les mises à jour appliquées
      return { ...existingProduct, ...updatedData };
    }
    
    return updatedProduct || { ...existingProduct, ...updatedData };
  } catch (error) {
    console.error('Error in updateProduct:', error);
    throw error;
  }
};

/**
 * Supprime un produit
 */
export const deleteProduct = async (id: string) => {
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
 * @param file The image file to upload
 * @param productId The product ID
 * @param isMain Whether this is the main product image
 * @returns The URL of the uploaded image or null if there was an error
 */
export const uploadProductImage = async (
  file: File,
  productId: string,
  isMain: boolean = false
): Promise<string | null> => {
  try {
    // Determine file extension
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    
    // Create a unique filename within the product folder
    const timestamp = Date.now();
    const fileName = `${isMain ? 'main' : `image-${timestamp}`}.${fileExt}`;
    const filePath = `products/${productId}/${fileName}`;
    
    // Determine content type
    let contentType = file.type;
    if (fileExt === 'webp') contentType = 'image/webp';
    
    console.log(`Uploading image: ${filePath} (${contentType})`);
    
    // Upload the file to the storage bucket
    const { data, error } = await supabase.storage
      .from('catalog')
      .upload(filePath, file, {
        contentType,
        upsert: true,
      });
    
    if (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
    
    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from('catalog')
      .getPublicUrl(filePath);
    
    const imageUrl = publicUrlData.publicUrl;
    console.log("Image uploaded successfully:", imageUrl);
    
    // If this is the main image, update the product
    if (isMain) {
      await updateProduct(productId, { image_url: imageUrl });
    }
    
    return imageUrl;
  } catch (error: any) {
    console.error(`Error in uploadProductImage:`, error);
    return null;
  }
};

/**
 * Convertit un produit normal en produit parent (avec variantes)
 */
export const convertProductToParent = async (id: string, variationAttributes = {}) => {
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

/**
 * Duplique un produit existant
 */
export const duplicateProduct = async (productId: string): Promise<Product> => {
  try {
    // 1. Récupérer le produit à dupliquer
    const { data: originalProduct, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching product to duplicate:', fetchError);
      throw new Error(fetchError.message);
    }
    
    if (!originalProduct) {
      throw new Error(`Product with ID ${productId} not found`);
    }
    
    // Récupérer le company_id de l'utilisateur connecté
    const company_id = await getCurrentUserCompanyId();
    
    // 2. Préparer les données du nouveau produit
    const duplicatedProductData = {
      ...originalProduct,
      id: undefined, // Supabase générera un nouvel ID
      name: `${originalProduct.name} (copie)`,
      created_at: undefined, // Supabase définira la date actuelle
      updated_at: undefined, // Supabase définira la date actuelle
      company_id: company_id // Utiliser le company_id de l'utilisateur actuel
    };
    
    // Remove any undefined/null fields that might cause issues
    delete duplicatedProductData.id;
    delete duplicatedProductData.created_at;
    delete duplicatedProductData.updated_at;
    
    console.log('Duplicating product with data:', JSON.stringify(duplicatedProductData, null, 2));
    
    // 3. Insérer le nouveau produit
    const { data: newProduct, error: insertError } = await supabase
      .from('products')
      .insert([duplicatedProductData])
      .select()
      .single();
    
    if (insertError) {
      console.error('Error duplicating product:', insertError);
      throw new Error(insertError.message);
    }
    
    // 4. Si le produit a des prix de variantes, les dupliquer également
    if (originalProduct.is_parent) {
      const { data: variantPrices, error: variantPricesError } = await supabase
        .from('product_variant_prices')
        .select('*')
        .eq('product_id', productId);
      
      if (!variantPricesError && variantPrices && variantPrices.length > 0) {
        // Préparer les nouvelles combinaisons de prix
        const newVariantPrices = variantPrices.map(price => {
          const newPrice = {
            ...price,
            id: undefined, // Supabase générera un nouvel ID
            product_id: newProduct.id, // Utiliser l'ID du produit dupliqué
            created_at: undefined,
            updated_at: undefined
          };
          
          // Remove any fields that might cause issues
          delete newPrice.id;
          delete newPrice.created_at;
          delete newPrice.updated_at;
          
          return newPrice;
        });
        
        console.log('Duplicating variant prices:', JSON.stringify(newVariantPrices, null, 2));
        
        // Insérer les nouvelles combinaisons de prix
        const { error: insertVariantsError } = await supabase
          .from('product_variant_prices')
          .insert(newVariantPrices);
        
        if (insertVariantsError) {
          console.error('Error duplicating variant prices:', insertVariantsError);
          // Ne pas échouer complètement si seuls les prix de variantes échouent
        }
      }
    }
    
    return {
      ...newProduct,
      createdAt: newProduct.created_at,
      updatedAt: newProduct.updated_at
    };
  } catch (error) {
    console.error('Error in duplicateProduct:', error);
    throw error;
  }
};
