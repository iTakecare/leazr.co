
import { supabase } from '@/integrations/supabase/client';
import { dbToAppProduct, dbToAppProducts, jsonToProductAttributes, jsonToSpecifications, jsonToStringArrayRecord } from '@/utils/typeMappers';

/**
 * Récupère tous les produits avec leurs variantes et prix de variantes
 */
export const getProducts = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching products:', error);
      throw error;
    }

    // Data is already transformed by our interceptor
    return data || [];
  } catch (error) {
    console.error('Failed to fetch products:', error);
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
      console.error(`Error fetching product with ID ${id}:`, error);
      throw error;
    }

    // Data is already transformed by our interceptor
    return data;
  } catch (error) {
    console.error('Failed to fetch product by ID:', error);
    throw error;
  }
};

/**
 * Ajoute un nouveau produit
 */
export const addProduct = async (productData: any) => {
  try {
    // Ensure required fields are present
    if (!productData.name) {
      throw new Error('Product name is required');
    }

    // Make sure to convert Date objects to ISO strings for Supabase
    const productToInsert = {
      ...productData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Ensure fields match the database schema
      name: productData.name,
      price: productData.price || 0,
    };

    const { data, error } = await supabase
      .from('products')
      .insert(productToInsert)
      .select()
      .single();

    if (error) {
      console.error('Error adding product:', error);
      throw error;
    }

    return dbToAppProduct(data);
  } catch (error) {
    console.error('Failed to add product:', error);
    throw error;
  }
};

/**
 * Met à jour un produit existant
 */
export const updateProduct = async (id: string, productData: any) => {
  try {
    // Convert createdAt/updatedAt to DB format if needed
    const productToUpdate = {
      ...productData,
      updated_at: new Date().toISOString(),
      // Map any additional fields as needed
    };

    // Remove client-side only properties that shouldn't be sent to the DB
    delete productToUpdate.createdAt;
    delete productToUpdate.updatedAt;
    delete productToUpdate.imageUrl; // Use image_url in DB

    // Ensure required fields for update
    if (!productToUpdate.name) {
      throw new Error('Product name is required for update');
    }

    const { data, error } = await supabase
      .from('products')
      .update(productToUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating product with ID ${id}:`, error);
      throw error;
    }

    return dbToAppProduct(data);
  } catch (error) {
    console.error('Failed to update product:', error);
    throw error;
  }
};

/**
 * Supprime un produit
 */
export const deleteProduct = async (id: string) => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting product with ID ${id}:`, error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete product:', error);
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
 * Met à jour plusieurs produits en une fois
 * @param products Array of product data to update
 * @returns Array of updated products
 */
export const bulkUpdateProducts = async (products: any[]) => {
  try {
    if (!Array.isArray(products) || products.length === 0) {
      return [];
    }

    // For each product we need to ensure the database format is correct
    const productsToUpdate = products.map(product => ({
      ...product,
      updated_at: new Date().toISOString(),
      // Ensure name is present (required by DB)
      name: product.name || 'Unnamed Product'
    }));

    const { data, error } = await supabase
      .from('products')
      .upsert(productsToUpdate, {
        onConflict: 'id',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Error bulk updating products:', error);
      throw error;
    }

    return data ? dbToAppProducts(data) : [];
  } catch (error) {
    console.error('Failed to bulk update products:', error);
    throw error;
  }
};

/**
 * Trouver une variante par ses attributs
 */
export const findVariantByAttributes = async (productId: string, attributes: Record<string, any>) => {
  try {
    // First get all variant combination prices for this parent product
    const { data: combinations, error } = await supabase
      .from('variant_combination_prices')
      .select('*')
      .eq('product_id', productId);
    
    if (error) {
      console.error('Error fetching variant combinations:', error);
      throw error;
    }
    
    // Now find the matching variant by comparing attributes
    const matchingVariant = combinations.find((combo: any) => {
      const comboAttributes = combo.attributes || {};
      // Check if all requested attributes match
      return Object.entries(attributes).every(([key, value]) => 
        comboAttributes[key] === value
      );
    });
    
    return matchingVariant || null;
  } catch (error) {
    console.error('Failed to find variant by attributes:', error);
    return null;
  }
};

/**
 * Create a new product
 */
export const createProduct = async (productData: any) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert({
        ...productData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating product:', error);
      throw error;
    }
    
    return dbToAppProduct(data);
  } catch (error) {
    console.error('Failed to create product:', error);
    throw error;
  }
};

// CATEGORY MANAGEMENT FUNCTIONS

/**
 * Get all product categories
 */
export const getCategories = async () => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return [];
  }
};

/**
 * Add a new category
 */
export const addCategory = async ({ name, translation }: { name: string, translation: string }) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name,
        translation,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding category:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to add category:', error);
    throw error;
  }
};

/**
 * Update a category
 */
export const updateCategory = async ({ 
  originalName, 
  name, 
  translation 
}: { 
  originalName: string, 
  name: string, 
  translation: string 
}) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .update({
        name,
        translation,
        updated_at: new Date().toISOString()
      })
      .eq('name', originalName)
      .select()
      .single();

    if (error) {
      console.error('Error updating category:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to update category:', error);
    throw error;
  }
};

/**
 * Delete a category
 */
export const deleteCategory = async ({ name }: { name: string }) => {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('name', name);

    if (error) {
      console.error('Error deleting category:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete category:', error);
    throw error;
  }
};

// BRAND MANAGEMENT FUNCTIONS

/**
 * Get all product brands
 */
export const getBrands = async () => {
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching brands:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch brands:', error);
    return [];
  }
};

/**
 * Add a new brand
 */
export const addBrand = async ({ name, translation }: { name: string, translation: string }) => {
  try {
    const { data, error } = await supabase
      .from('brands')
      .insert({
        name,
        translation,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding brand:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to add brand:', error);
    throw error;
  }
};

/**
 * Update a brand
 */
export const updateBrand = async ({ 
  originalName, 
  name, 
  translation 
}: { 
  originalName: string, 
  name: string, 
  translation: string 
}) => {
  try {
    const { data, error } = await supabase
      .from('brands')
      .update({
        name,
        translation,
        updated_at: new Date().toISOString()
      })
      .eq('name', originalName)
      .select()
      .single();

    if (error) {
      console.error('Error updating brand:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to update brand:', error);
    throw error;
  }
};

/**
 * Delete a brand
 */
export const deleteBrand = async ({ name }: { name: string }) => {
  try {
    const { error } = await supabase
      .from('brands')
      .delete()
      .eq('name', name);

    if (error) {
      console.error('Error deleting brand:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete brand:', error);
    throw error;
  }
};
