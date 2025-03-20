import { getSupabaseClient, getAdminSupabaseClient } from "@/integrations/supabase/client";
import { Product, ProductAttributes, ProductVariationAttributes } from "@/types/catalog";
import { products as sampleProducts } from "@/data/products";

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

export async function getProductById(id: string): Promise<Product | null> {
  try {
    console.log(`Fetching product with ID: ${id}`);
    const supabase = getSupabaseClient();
    
    const { data: mainProduct, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching product by ID ${id}:`, error);
      throw new Error(`Error fetching product by ID: ${error.message}`);
    }

    if (!mainProduct) {
      console.log(`No product found with ID: ${id}`);
      return null;
    }
    
    console.log("Main product:", {
      id: mainProduct.id,
      name: mainProduct.name,
      is_parent: mainProduct.is_parent,
      parent_id: mainProduct.parent_id
    });
    
    // Parse attributes to ensure consistent format
    mainProduct.attributes = parseAttributes(mainProduct.attributes);
    
    if (mainProduct.is_parent) {
      console.log(`Product ${id} is a parent, fetching variants and combination prices...`);
      
      // Fetch variants
      const variants = await getProductVariants(id);
      if (variants.length > 0) {
        console.log(`Found ${variants.length} variants for product ${id}`);
        
        mainProduct.variants = variants;
        
        // Extract all possible attribute options from variants
        mainProduct.variation_attributes = extractVariationAttributesFromVariants(variants);
        console.log("Extracted variation attributes:", mainProduct.variation_attributes);
      } else {
        console.log(`No variants found for parent product ${id}`);
        mainProduct.variants = [];
      }
      
      // Fetch variant combination prices
      try {
        const { data: variantPrices, error: pricesError } = await supabase
          .from('product_variant_prices')
          .select('*')
          .eq('product_id', id);
        
        if (pricesError) {
          console.error(`Error fetching variant prices for product ${id}:`, pricesError);
        } else if (variantPrices && variantPrices.length > 0) {
          console.log(`Found ${variantPrices.length} price combinations for product ${id}`);
          mainProduct.variant_combination_prices = variantPrices.map(price => ({
            ...price,
            attributes: typeof price.attributes === 'string' 
              ? JSON.parse(price.attributes) 
              : price.attributes
          }));
        }
      } catch (priceError) {
        console.error("Error fetching variant prices:", priceError);
      }
    }
    else if (mainProduct.parent_id) {
      console.log(`Product ${id} is a variant, fetching parent and siblings...`);
      
      const parent = await getProductById(mainProduct.parent_id);
      if (parent) {
        console.log(`Found parent ${parent.id} for product ${id}`);
        
        const siblings = await getProductVariants(parent.id);
        if (siblings.length > 0) {
          console.log(`Found ${siblings.length} siblings for product ${id}`);
          
          mainProduct.variants = siblings;
          
          // Extract all possible attribute options from siblings
          mainProduct.variation_attributes = extractVariationAttributesFromVariants(siblings);
          console.log("Extracted variation attributes from siblings:", mainProduct.variation_attributes);
        }
      }
    }

    console.log(`Successfully retrieved product with ID: ${id}`, mainProduct);
    return mainProduct;
  } catch (error) {
    console.error("Error in getProductById:", error);
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
export async function uploadProductImage(file: File, productId: string, isMainImage: boolean = true): Promise<string> {
  try {
    console.log(`Uploading ${isMainImage ? 'main' : 'additional'} image for product ${productId}`);
    
    // Check if the product exists
    const product = await getProductById(productId);
    if (!product) {
      console.error(`Product ${productId} not found`);
      throw new Error(`Product ${productId} not found`);
    }
    
    console.log(`Main product:`, JSON.stringify({
      id: product.id,
      name: product.name,
      is_parent: product.is_parent,
      parent_id: product.parent_id
    }));
    
    const productName = product?.name || '';
    console.log(`Uploading image for product: ${productName}`);
    
    const { uploadImage } = await import("@/services/imageService");
    
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const path = `${productId}/${isMainImage ? 'main' : `additional_${timestamp}`}_${timestamp}.${extension}`;
    
    console.log(`Calling uploadImage with path: ${path}`);
    const result = await uploadImage(file, path, 'product-images', true);
    
    if (!result || !result.url) {
      console.error("Failed to upload image:", result);
      throw new Error("Failed to upload image");
    }
    
    console.log(`Image uploaded successfully with URL: ${result.url}`);
    
    if (product) {
      if (isMainImage) {
        console.log(`Updating main image for product ${productId}`);
        await updateProduct(productId, { 
          image_url: result.url,
          ...(result.altText ? { 
            image_alt: result.altText,
            image_alts: [result.altText]
          } : {})
        });
      } else {
        console.log(`Adding additional image for product ${productId}`);
        const imageUrls = product.image_urls || [];
        const imageAlts = product.image_alts || [];
        
        // Add the new image URL
        const updatedImageUrls = [...imageUrls, result.url];
        const updatedImageAlts = [...imageAlts, result.altText];
        
        await updateProduct(productId, {
          image_urls: updatedImageUrls,
          image_alts: updatedImageAlts
        });
      }
    }
    
    return result.url;
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
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);
    
    if (error) {
      throw new Error(`Error deleting product: ${error.message}`);
    }
    
    const { data: children, error: childrenError } = await supabase
      .from('products')
      .delete()
      .eq('parent_id', productId);
    
    if (childrenError) {
      console.error(`Error deleting child products: ${childrenError.message}`);
    }
    
    return Promise.resolve();
  } catch (error) {
    console.error("Error in deleteProduct:", error);
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
