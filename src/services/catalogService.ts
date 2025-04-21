
import { Product, Brand, Category, ProductAttributes, VariantCombinationPrice } from "@/types/catalog";
import { supabase } from "@/integrations/supabase/client";
import { transformDatabaseProducts } from "@/utils/productTransformer";
import { uploadImage, ensureBucket } from "@/services/fileUploadService";

/**
 * Get all products from the database
 */
export const getProducts = async ({ includeAdminOnly = false } = {}): Promise<Product[]> => {
  try {
    let query = supabase
      .from('products')
      .select('*')
      .eq('active', true);
      
    if (!includeAdminOnly) {
      query = query.eq('admin_only', false);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching products:', error);
      return [];
    }
    
    return transformDatabaseProducts(data || []);
  } catch (error) {
    console.error('Error in getProducts:', error);
    return [];
  }
};

/**
 * Get a single product by ID
 */
export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    if (!id) return null;
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error || !data) {
      console.error('Error fetching product by ID:', error);
      return null;
    }
    
    const [transformedProduct] = transformDatabaseProducts([data]);
    return transformedProduct || null;
  } catch (error) {
    console.error('Error in getProductById:', error);
    return null;
  }
};

/**
 * Upload a product image to Supabase storage
 */
export const uploadProductImage = async (
  file: File, 
  productId: string, 
  isMain: boolean = false
): Promise<string | null> => {
  try {
    // Ensure the product-images bucket exists
    await ensureBucket('product-images');
    
    // Upload the image to Supabase storage
    const imageUrl = await uploadImage(file, 'product-images', productId);
    
    if (!imageUrl) {
      console.error('Failed to upload image to storage');
      return null;
    }
    
    // If this is the main image, update the product's image_url
    if (isMain && imageUrl) {
      await supabase
        .from('products')
        .update({ image_url: imageUrl })
        .eq('id', productId);
    } else if (imageUrl) {
      // Add to additional images
      const { data } = await supabase
        .from('products')
        .select('image_urls')
        .eq('id', productId)
        .single();
        
      let imageUrls = data?.image_urls || [];
      if (!Array.isArray(imageUrls)) {
        imageUrls = [];
      }
      
      imageUrls.push(imageUrl);
      
      await supabase
        .from('products')
        .update({ image_urls: imageUrls })
        .eq('id', productId);
    }
    
    return imageUrl;
  } catch (error) {
    console.error('Error uploading product image:', error);
    return null;
  }
};

/**
 * Stub implementations for functions needed by components
 * These will need proper implementation later
 */
export const addProduct = async (product: Partial<Product>) => {
  console.log('addProduct called with:', product);
  return { id: 'temp-id' };
};

export const updateProduct = async (id: string, product: Partial<Product>) => {
  console.log('updateProduct called with:', id, product);
  return { id };
};

export const deleteProduct = async (id: string) => {
  console.log('deleteProduct called with:', id);
  return true;
};

export const duplicateProduct = async (id: string) => {
  console.log('duplicateProduct called with:', id);
  return { id: 'duplicate-id' };
};

export const getBrands = async () => {
  console.log('getBrands called');
  return [];
};

export const getCategories = async () => {
  console.log('getCategories called');
  return [];
};

export const addBrand = async () => {
  console.log('addBrand called');
};

export const updateBrand = async () => {
  console.log('updateBrand called');
};

export const deleteBrand = async () => {
  console.log('deleteBrand called');
};

export const addCategory = async () => {
  console.log('addCategory called');
};

export const updateCategory = async () => {
  console.log('updateCategory called');
};

export const deleteCategory = async () => {
  console.log('deleteCategory called');
};

export const findVariantByAttributes = async () => {
  console.log('findVariantByAttributes called');
  return null;
};

export const searchProducts = async (term: string): Promise<Product[]> => {
  try {
    if (!term) return [];
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .or(`name.ilike.%${term}%,description.ilike.%${term}%,brand.ilike.%${term}%,category.ilike.%${term}%`)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error searching products:', error);
      return [];
    }
    
    return transformDatabaseProducts(data || []);
  } catch (error) {
    console.error('Error in searchProducts:', error);
    return [];
  }
};

// Add additional functions that appear to be missing in imports
export const createProduct = async (product: Partial<Product>) => {
  console.log('createProduct called with:', product);
  return { id: 'new-product-id' };
};

export const convertProductToParent = async (productId: string, modelName: string) => {
  console.log('convertProductToParent called with:', productId, modelName);
  return { success: true };
};

