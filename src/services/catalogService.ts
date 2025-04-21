
import { supabase, getAdminSupabaseClient } from '@/integrations/supabase/client';
import { Product, Category, Brand, VariantCombinationPrice } from '@/types/catalog';
import { toast } from 'sonner';
import { transformDatabaseProduct, transformDatabaseProducts } from '@/utils/productTransformer';

interface ProductQueryOptions {
  includeAdminOnly?: boolean;
  limit?: number;
  category?: string;
  brand?: string;
  search?: string;
}

// Get all products
export const getProducts = async (options: ProductQueryOptions = {}): Promise<Product[]> => {
  const { 
    includeAdminOnly = false, 
    limit = 100,
    category,
    brand,
    search
  } = options;
  
  try {
    // Create base query
    let query = supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('name')
      .limit(limit);
    
    // Add filters
    if (!includeAdminOnly) {
      query = query.eq('admin_only', false);
    }
    
    if (category) {
      query = query.eq('category', category);
    }
    
    if (brand) {
      query = query.eq('brand', brand);
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    // Execute query
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Transform products
    return transformDatabaseProducts(data || []);
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

// Get product by ID
export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    // Get variants if this is a parent product
    let variants: Product[] = [];
    if (data?.is_parent) {
      const { data: variantsData, error: variantsError } = await supabase
        .from('products')
        .select('*')
        .eq('parent_id', id);
      
      if (!variantsError && variantsData) {
        variants = transformDatabaseProducts(variantsData);
      }
    }
    
    // Get variant prices
    const { data: pricesData, error: pricesError } = await supabase
      .from('product_variant_prices')
      .select('*')
      .eq('product_id', id);
    
    // Transform the product
    const transformedProduct = transformDatabaseProduct(data);
    
    // Add variants and prices
    return {
      ...transformedProduct,
      variants,
      variant_combination_prices: pricesData || []
    };
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    return null;
  }
};

// Update product
export const updateProduct = async (id: string, data: Partial<Product>): Promise<Product | null> => {
  try {
    // Clean up the data object
    const updateData = { ...data };
    
    // Remove nested objects that shouldn't be sent directly
    delete updateData.variants;
    delete updateData.variant_combination_prices;
    
    // Map createdAt/updatedAt to created_at/updated_at
    if (updateData.createdAt) {
      updateData.created_at = updateData.createdAt;
      delete updateData.createdAt;
    }
    
    if (updateData.updatedAt) {
      updateData.updated_at = updateData.updatedAt;
      delete updateData.updatedAt;
    }
    
    // Update the product
    const { data: updatedProduct, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return transformDatabaseProduct(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

// Delete product
export const deleteProduct = async (id: string): Promise<void> => {
  try {
    // Check if product has variants
    const { data: product } = await supabase
      .from('products')
      .select('is_parent')
      .eq('id', id)
      .single();
    
    if (product?.is_parent) {
      // Delete all variants first
      await supabase
        .from('products')
        .delete()
        .eq('parent_id', id);
      
      // Delete variant prices
      await supabase
        .from('product_variant_prices')
        .delete()
        .eq('product_id', id);
    }
    
    // Delete the product
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

// Upload product image
export const uploadProductImage = async (
  file: File, 
  productId: string, 
  isMain: boolean = true
): Promise<string> => {
  try {
    // Generate a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${productId}${isMain ? '' : '_' + new Date().getTime()}.${fileExt}`;
    const filePath = `products/${fileName}`;
    
    // Upload file
    const { data, error } = await supabase.storage
      .from('products')
      .upload(filePath, file, { upsert: true });
    
    if (error) throw error;
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('products')
      .getPublicUrl(filePath);
    
    const imageUrl = urlData.publicUrl;
    
    // Update product
    if (isMain) {
      await supabase
        .from('products')
        .update({ image_url: imageUrl })
        .eq('id', productId);
    } else {
      // Get current additional images
      const { data: product } = await supabase
        .from('products')
        .select('image_urls')
        .eq('id', productId)
        .single();
      
      const currentImages = product?.image_urls || [];
      const updatedImages = [...currentImages, imageUrl];
      
      await supabase
        .from('products')
        .update({ image_urls: updatedImages })
        .eq('id', productId);
    }
    
    return imageUrl;
  } catch (error) {
    console.error('Error uploading product image:', error);
    throw error;
  }
};

// Convert product to parent
export const convertProductToParent = async (
  productId: string,
  modelName: string
): Promise<void> => {
  try {
    await supabase
      .from('products')
      .update({
        is_parent: true,
        model: modelName,
        variation_attributes: {}
      })
      .eq('id', productId);
  } catch (error) {
    console.error('Error converting product to parent:', error);
    throw error;
  }
};

// Get all categories
export const getCategories = async (): Promise<Category[]> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

// Get all brands
export const getBrands = async (): Promise<Brand[]> => {
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching brands:', error);
    return [];
  }
};

// Add variant combination price
export const addVariantCombinationPrice = async (
  price: Omit<VariantCombinationPrice, 'id' | 'created_at' | 'updated_at'>
): Promise<VariantCombinationPrice | null> => {
  try {
    const { data, error } = await supabase
      .from('product_variant_prices')
      .insert([price])
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error adding variant price:', error);
    throw error;
  }
};

// Update variant combination price
export const updateVariantCombinationPrice = async (
  id: string,
  price: Partial<VariantCombinationPrice>
): Promise<VariantCombinationPrice | null> => {
  try {
    const { data, error } = await supabase
      .from('product_variant_prices')
      .update(price)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error updating variant price:', error);
    throw error;
  }
};

// Delete variant combination price
export const deleteVariantCombinationPrice = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('product_variant_prices')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting variant price:', error);
    throw error;
  }
};

// Create a new product
export const createProduct = async (product: Partial<Product>): Promise<Product | null> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select()
      .single();
    
    if (error) throw error;
    
    return transformDatabaseProduct(data);
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

// Generate product suggestions
export const generateProductSuggestions = async (
  query: string,
  category?: string
): Promise<Product[]> => {
  try {
    let dbQuery = supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .ilike('name', `%${query}%`)
      .limit(5);
    
    if (category) {
      dbQuery = dbQuery.eq('category', category);
    }
    
    const { data, error } = await dbQuery;
    
    if (error) throw error;
    
    return transformDatabaseProducts(data || []);
  } catch (error) {
    console.error('Error generating product suggestions:', error);
    return [];
  }
};
