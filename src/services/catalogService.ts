import { getSupabaseClient, getAdminSupabaseClient } from "@/integrations/supabase/client";
import { Product, ProductAttributes, ProductVariationAttributes } from "@/types/catalog";

export async function getProducts(): Promise<Product[]> {
  try {
    console.log("Fetching products from API");
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching products from API:", error);
      throw new Error(`API Error: ${error.message}`);
    }

    console.log(`Retrieved ${data?.length || 0} products from API`);
    return data || [];
  } catch (error) {
    console.error("Error in getProducts:", error);
    return [];
  }
}

export async function getProductsByModel(model: string): Promise<Product[]> {
  try {
    console.log(`Fetching products with model: ${model}`);
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('model', model)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error fetching products with model ${model}:`, error);
      throw new Error(`API Error: ${error.message}`);
    }

    console.log(`Retrieved ${data?.length || 0} products with model ${model}`);
    return data || [];
  } catch (error) {
    console.error("Error in getProductsByModel:", error);
    return [];
  }
}

export async function getParentProducts(): Promise<Product[]> {
  try {
    console.log("Fetching parent products");
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_parent', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching parent products:", error);
      throw new Error(`API Error: ${error.message}`);
    }

    console.log(`Retrieved ${data?.length || 0} parent products`);
    return data || [];
  } catch (error) {
    console.error("Error in getParentProducts:", error);
    return [];
  }
}

export async function getProductVariants(parentId: string): Promise<Product[]> {
  try {
    console.log(`Fetching variants for product with ID: ${parentId}`);
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('parent_id', parentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error fetching variants for product ${parentId}:`, error);
      throw new Error(`API Error: ${error.message}`);
    }

    const variants = data || [];
    console.log(`Retrieved ${variants.length} variants for product ${parentId}`);
    
    // Process each variant to ensure attributes are in the correct format
    return variants.map(variant => ({
      ...variant,
      attributes: parseAttributes(variant.attributes)
    }));
  } catch (error) {
    console.error("Error in getProductVariants:", error);
    return [];
  }
}

export async function getProductById(productId: string): Promise<Product> {
  try {
    console.log(`Fetching product with ID: ${productId}`);
    const supabase = getSupabaseClient();
    
    // First get the product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError) {
      console.error("Error fetching product:", productError);
      throw new Error(`Error fetching product: ${productError.message}`);
    }

    if (!product) {
      throw new Error(`Product not found with ID: ${productId}`);
    }

    // Get variant price combinations separately
    const { data: variantPrices, error: variantPricesError } = await supabase
      .from('product_variant_prices')
      .select('*')
      .eq('product_id', productId);
      
    if (variantPricesError) {
      console.error("Error fetching variant prices:", variantPricesError);
      // Continue anyway - this is not a blocking error
    }

    // Get variants if it's a parent product
    let variants = [];
    if (product.is_parent) {
      const { data: variantsData, error: variantsError } = await supabase
        .from('products')
        .select('*')
        .eq('parent_id', productId);
        
      if (variantsError) {
        console.error("Error fetching variants:", variantsError);
        // Continue anyway - this is not a blocking error
      } else {
        variants = variantsData || [];
      }
    }

    // Ensure image_urls is always an array
    if (!product.image_urls || !Array.isArray(product.image_urls)) {
      product.image_urls = [];
    }

    // Filter out any null or empty strings in image_urls
    product.image_urls = product.image_urls.filter(url => url && url.trim() !== '');

    // Build the complete product object with related data
    const completeProduct = {
      ...product,
      variants: variants,
      variant_combination_prices: variantPrices || []
    };

    console.log(`Retrieved product with ID ${productId}:`, completeProduct);
    return completeProduct as Product;
  } catch (error) {
    console.error(`Error in getProductById(${productId}):`, error);
    throw error;
  }
}

/**
 * Parse product attributes into a consistent format
 */
export function parseAttributes(attributes: any): ProductAttributes {
  console.log("Parsing attributes:", attributes);
  if (!attributes) {
    return {};
  }
  
  try {
    // If attributes is a string, try to parse it as JSON
    if (typeof attributes === 'string') {
      try {
        return parseAttributes(JSON.parse(attributes));
      } catch (e) {
        console.log("Failed to parse attributes string:", attributes);
        return {};
      }
    }
    
    // If attributes is an object (not array), return it as is with proper type conversion
    if (typeof attributes === 'object' && !Array.isArray(attributes)) {
      const result: ProductAttributes = {};
      
      Object.entries(attributes).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          result[key] = value;
        } else if (value !== null && value !== undefined) {
          result[key] = String(value);
        }
      });
      
      return result;
    }
    
    // If attributes is an array, convert it to an object
    if (Array.isArray(attributes)) {
      const result: ProductAttributes = {};
      
      attributes.forEach((attr, index) => {
        // If attribute is an object with name and value properties
        if (attr && typeof attr === 'object' && 'name' in attr && 'value' in attr) {
          result[attr.name] = attr.value;
        }
        // If attribute is a string with format "key:value"
        else if (typeof attr === 'string') {
          if (attr.includes(':')) {
            const [key, value] = attr.split(':', 2);
            result[key.trim()] = value.trim();
          } else {
            result[`option_${index}`] = attr;
          }
        }
        // For any other type, convert to string
        else if (attr !== null && attr !== undefined) {
          result[`option_${index}`] = typeof attr === 'object' 
            ? JSON.stringify(attr) 
            : String(attr);
        }
      });
      
      return result;
    }
  } catch (e) {
    console.error("Error parsing attributes:", e);
  }
  
  return {};
}

/**
 * Extract all possible attribute options from a list of variants
 */
export function extractVariationAttributesFromVariants(variants: Product[]): ProductVariationAttributes {
  if (!variants || variants.length === 0) {
    return {};
  }
  
  const attributeOptions: Record<string, Set<string>> = {};
  
  variants.forEach(variant => {
    if (variant.attributes) {
      Object.entries(variant.attributes).forEach(([attrName, attrValue]) => {
        if (!attributeOptions[attrName]) {
          attributeOptions[attrName] = new Set();
        }
        attributeOptions[attrName].add(String(attrValue));
      });
    }
  });
  
  // Convert Set to Array for each attribute
  const result: ProductVariationAttributes = {};
  Object.entries(attributeOptions).forEach(([attrName, values]) => {
    result[attrName] = Array.from(values).sort();
  });
  
  return result;
}

export async function findVariantByAttributes(
  parentId: string, 
  selectedAttributes: ProductAttributes
): Promise<Product | null> {
  try {
    console.log(`Finding variant for parent ${parentId} with attributes:`, selectedAttributes);
    const variants = await getProductVariants(parentId);
    
    if (!variants || variants.length === 0) {
      return null;
    }
    
    // Convert selectedAttributes keys to lowercase for case-insensitive comparison
    const normalizedSelectedAttrs: Record<string, string> = {};
    Object.entries(selectedAttributes).forEach(([key, value]) => {
      normalizedSelectedAttrs[key.toLowerCase()] = String(value).toLowerCase();
    });
    
    // Find the variant that matches all selected attributes
    const matchingVariant = variants.find(variant => {
      if (!variant.attributes) return false;
      
      // Convert variant attributes keys to lowercase
      const normalizedVariantAttrs: Record<string, string> = {};
      Object.entries(variant.attributes).forEach(([key, value]) => {
        normalizedVariantAttrs[key.toLowerCase()] = String(value).toLowerCase();
      });
      
      // Check if all selected attributes match this variant
      return Object.entries(normalizedSelectedAttrs).every(([key, value]) => 
        normalizedVariantAttrs[key] === value
      );
    });
    
    if (matchingVariant) {
      console.log(`Found matching variant: ${matchingVariant.id}`);
    } else {
      console.log(`No matching variant found for attributes:`, selectedAttributes);
    }
    
    return matchingVariant || null;
  } catch (error) {
    console.error("Error in findVariantByAttributes:", error);
    return null;
  }
}

export async function addProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ id: string }> {
  try {
    console.log("Adding product to database:", product);
    const supabase = getSupabaseClient();
    
    // Préparation des données du produit
    const productData = {
      ...product,
      image_url: product.imageUrl,
    };
    
    // Suppression des champs qui ne correspondent pas au schéma de la table
    delete (productData as any).imageUrl;
    
    console.log("Prepared product data for insertion:", productData);
    
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select('id')
      .single();

    if (error) {
      console.error("Error adding product:", error);
      throw new Error(`Error adding product: ${error.message}`);
    }

    if (!data || !data.id) {
      console.error("Product ID not found after insertion");
      throw new Error("Product ID not found after insertion.");
    }

    console.log("Product successfully added with ID:", data.id);
    return { id: data.id };
  } catch (error) {
    console.error("Error in addProduct:", error);
    throw error;
  }
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
  try {
    console.log(`Updating product with ID: ${id}`, updates);
    const supabase = getSupabaseClient();
    
    const updateData = { ...updates };
    if ('imageUrl' in updateData) {
      updateData.image_url = updateData.imageUrl;
      delete updateData.imageUrl;
    }
    
    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error(`Error updating product with ID ${id}:`, error);
      throw new Error(`Error updating product: ${error.message}`);
    }

    console.log(`Successfully updated product with ID: ${id}`);
    return data || null;
  } catch (error) {
    console.error("Error in updateProduct:", error);
    throw error;
  }
}

/**
 * Upload an image for a product and update the product with the image URL
 */
export async function uploadProductImage(file: File, productId: string, isMain: boolean = false): Promise<string> {
  try {
    console.log(`Uploading ${isMain ? 'main' : 'additional'} image for product ${productId}: ${file.name}`);
    
    // Generate a unique file name
    const filename = `${file.name.split('.')[0]}-${Date.now()}.${file.name.split('.').pop()}`;
    const filePath = `${productId}/${filename}`;
    
    const supabase = getSupabaseClient();
    
    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

    if (uploadError) {
      console.error("Error uploading image to storage:", uploadError);
      throw new Error(`Error uploading image: ${uploadError.message}`);
    }

    // Get public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData?.publicUrl;

    if (!publicUrl) {
      throw new Error("Failed to get public URL for uploaded image");
    }

    // Update the product record with the new image URL
    const product = await getProductById(productId);
    
    if (isMain) {
      // Update main image
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          image_url: publicUrl,
          image_alt: filename
        })
        .eq('id', productId);

      if (updateError) {
        console.error("Error updating main product image:", updateError);
        throw new Error(`Error updating product image: ${updateError.message}`);
      }
    } else {
      // Update or add to additional images
      let imageUrls = product.image_urls || [];
      if (!Array.isArray(imageUrls)) {
        imageUrls = [];
      }
      
      imageUrls.push(publicUrl);
      
      const { error: updateError } = await supabase
        .from('products')
        .update({ image_urls: imageUrls })
        .eq('id', productId);

      if (updateError) {
        console.error("Error updating additional product images:", updateError);
        throw new Error(`Error updating additional images: ${updateError.message}`);
      }
    }

    console.log(`Successfully uploaded ${isMain ? 'main' : 'additional'} image: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error("Error in uploadProductImage:", error);
    throw error;
  }
}

export async function uploadMultipleProductImages(files: File[], productId: string): Promise<string[]> {
  try {
    if (!files.length) {
      return [];
    }
    
    const product = await getProductById(productId);
    const productName = product?.name || '';
    
    const { uploadProductImages } = await import("@/services/imageService");
    
    const uploadedImages = await uploadProductImages(files, productId, productName);
    
    if (uploadedImages.length === 0) {
      throw new Error("No images were uploaded successfully");
    }
    
    const uploadedUrls = uploadedImages.map(img => img.url);
    const uploadedAlts = uploadedImages.map(img => img.altText);
    
    if (uploadedUrls.length > 0) {
      await updateProduct(productId, { 
        image_url: uploadedUrls[0],
        ...(uploadedAlts[0] ? { image_alt: uploadedAlts[0] } : {}),
        ...(uploadedUrls.length > 1 ? { image_urls: uploadedUrls.slice(1, 5) } : {}),
        ...(uploadedAlts.length > 1 ? { image_alts: uploadedAlts.slice(1, 5) } : {})
      });
    }
    
    return uploadedUrls;
  } catch (error) {
    console.error("Error in uploadMultipleProductImages:", error);
    throw error;
  }
}

export async function deleteAllProducts(): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('products')
      .delete()
      .neq('id', 'null');

    if (error) {
      throw new Error(`Error deleting all products: ${error.message}`);
    }

    return Promise.resolve();
  } catch (error) {
    console.error("Error in deleteAllProducts:", error);
    return Promise.reject(error);
  }
}

export async function deleteProduct(productId: string): Promise<void> {
  try {
    console.log(`Tentative de suppression du produit ${productId}`);
    const supabase = getSupabaseClient();
    
    // Vérifier si le produit existe
    const { data: productToDelete, error: checkError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();
      
    if (checkError) {
      console.error(`Erreur lors de la vérification du produit ${productId}:`, checkError);
      throw new Error(`Produit non trouvé: ${checkError.message}`);
    }
    
    // Supprimer d'abord toutes les variantes du produit s'il est parent
    if (productToDelete.is_parent) {
      console.log(`Le produit ${productId} est un parent, recherche des variantes à supprimer`);
      const { data: childProducts, error: childrenQueryError } = await supabase
        .from('products')
        .select('id')
        .eq('parent_id', productId);
        
      if (childrenQueryError) {
        console.error(`Erreur lors de la recherche des variantes enfants: ${childrenQueryError.message}`);
      } else if (childProducts && childProducts.length > 0) {
        console.log(`Suppression de ${childProducts.length} variantes enfants pour le produit ${productId}`);
        const childIds = childProducts.map(child => child.id);
        
        for (const childId of childIds) {
          const { error: childDeleteError } = await supabase
            .from('products')
            .delete()
            .eq('id', childId);
          
          if (childDeleteError) {
            console.error(`Erreur lors de la suppression de la variante ${childId}: ${childDeleteError.message}`);
          } else {
            console.log(`Variante ${childId} supprimée avec succès`);
          }
        }
      }
    }
    
    // Supprimer ensuite le produit principal
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);
    
    if (error) {
      console.error(`Erreur lors de la suppression du produit ${productId}: ${error.message}`);
      throw new Error(`Erreur lors de la suppression du produit: ${error.message}`);
    }
    
    console.log(`Produit ${productId} supprimé avec succès`);
    return Promise.resolve();
  } catch (error) {
    console.error("Erreur dans deleteProduct:", error);
    return Promise.reject(error);
  }
}

export const getCategories = async () => {
  try {
    console.log("Fetching categories from API");
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      if (error.code === '42P01') {
        console.log("Categories table does not exist yet. Using default categories.");
        return [
          { name: "laptop", translation: "Ordinateur portable" },
          { name: "desktop", translation: "Ordinateur de bureau" },
          { name: "tablet", translation: "Tablette" },
          { name: "smartphone", translation: "Smartphone" },
          { name: "accessories", translation: "Accessoires" },
          { name: "other", translation: "Autre" }
        ];
      }
      
      console.error("Error fetching categories from API:", error);
      throw new Error(`API Error: ${error.message}`);
    }

    console.log(`Retrieved ${data?.length || 0} categories from API`);
    return data || [];
  } catch (error) {
    console.error("Error in getCategories:", error);
    return [];
  }
}

export const addCategory = async ({ name, translation }: { name: string, translation: string }) => {
  try {
    console.log(`Adding category: ${name} (${translation})`);
    const supabase = getSupabaseClient();
    
    const { error: tableCheckError } = await supabase.rpc('check_table_exists', { table_name: 'categories' });
    
    if (tableCheckError && tableCheckError.message.includes('does not exist')) {
      const adminSupabase = getAdminSupabaseClient();
      await adminSupabase.rpc('create_categories_table');
    }

    const { data, error } = await supabase
      .from('categories')
      .insert([{ name, translation }])
      .select('*')
      .single();

    if (error) {
      console.error(`Error adding category ${name}:`, error);
      throw new Error(`Error adding category: ${error.message}`);
    }

    console.log(`Successfully added category ${name}`);
    return data;
  } catch (error) {
    console.error("Error in addCategory:", error);
    throw error;
  }
}

export const updateCategory = async ({ originalName, name, translation }: { originalName: string, name: string, translation: string }) => {
  try {
    console.log(`Updating category: ${originalName} -> ${name} (${translation})`);
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('categories')
      .update({ name, translation })
      .eq('name', originalName)
      .select('*')
      .single();

    if (error) {
      console.error(`Error updating category ${originalName}:`, error);
      throw new Error(`Error updating category: ${error.message}`);
    }

    console.log(`Successfully updated category ${originalName} to ${name}`);
    return data;
  } catch (error) {
    console.error("Error in updateCategory:", error);
    throw error;
  }
}

export const deleteCategory = async ({ name }: { name: string }) => {
  try {
    console.log(`Deleting category: ${name}`);
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('name', name);

    if (error) {
      console.error(`Error deleting category ${name}:`, error);
      throw new Error(`Error deleting category: ${error.message}`);
    }

    console.log(`Successfully deleted category ${name}`);
    return { success: true };
  } catch (error) {
    console.error("Error in deleteCategory:", error);
    throw error;
  }
}

export const getBrands = async () => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error("Error fetching brands:", error);
      throw new Error(error.message);
    }
    
    console.log(`Retrieved ${data?.length || 0} brands from API`);
    return data || [];
  } catch (error) {
    console.error("Error in getBrands:", error);
    return [];
  }
};

export const addBrand = async ({ name, translation }: { name: string, translation: string }) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .rpc('add_brand', { 
      brand_name: name,
      brand_translation: translation
    });
  
  if (error) {
    console.error("Error adding brand:", error);
    throw new Error(error.message);
  }
  
  return data;
};

export const updateBrand = async ({ originalName, name, translation }: { originalName: string, name: string, translation: string }) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .rpc('update_brand', { 
      original_name: originalName,
      new_name: name,
      new_translation: translation
    });
  
  if (error) {
    console.error("Error updating brand:", error);
    throw new Error(error.message);
  }
  
  return data;
};

export const deleteBrand = async ({ name }: { name: string }) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .rpc('delete_brand', { brand_name: name });
  
  if (error) {
    console.error("Error deleting brand:", error);
    throw new Error(error.message);
  }
  
  return data;
};

export async function createProductVariant(
  parentId: string, 
  variantData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { attributes: ProductAttributes }
): Promise<Product> {
  try {
    console.log(`Creating variant for parent ${parentId} with data:`, variantData);
    const supabase = getSupabaseClient();
    
    // Get parent product to inherit properties
    const parent = await getProductById(parentId);
    if (!parent) {
      throw new Error(`Parent product ${parentId} not found`);
    }
    
    // Prepare variant data
    const newVariant = {
      ...variantData,
      parent_id: parentId,
      is_variation: true,
      is_parent: false,
      model: parent.model || parent.name,
      image_url: variantData.imageUrl || variantData.image_url,
      brand: parent.brand,
      category: parent.category
    };
    
    // Remove fields we don't want to duplicate
    delete (newVariant as any).id;
    delete (newVariant as any).imageUrl;
    
    const { data, error } = await supabase
      .from('products')
      .insert([newVariant])
      .select()
      .single();
      
    if (error) {
      console.error("Error creating product variant:", error);
      throw error;
    }
    
    console.log(`Successfully created variant: ${data.id}`);
    return data;
  } catch (error) {
    console.error("Error in createProductVariant:", error);
    throw error;
  }
}

export async function convertProductToParent(
  productId: string,
  modelName?: string
): Promise<Product> {
  try {
    console.log(`Converting product ${productId} to parent`);
    const supabase = getSupabaseClient();
    
    const product = await getProductById(productId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }
    
    const updateData = {
      is_parent: true,
      model: modelName || product.name,
      parent_id: null,
      is_variation: false
    };
    
    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .select()
      .single();
      
    if (error) {
      console.error(`Error converting product ${productId} to parent:`, error);
      throw error;
    }
    
    console.log(`Successfully converted product ${productId} to parent`);
    return data;
  } catch (error) {
    console.error("Error in convertProductToParent:", error);
    throw error;
  }
}

