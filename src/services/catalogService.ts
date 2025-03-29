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
