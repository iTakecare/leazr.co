import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/catalog';
import { toast } from 'sonner';

export const getProducts = async (options: { includeAdminOnly?: boolean } = {}) => {
  console.log('📦 getProducts - Starting fetch with options:', options);
  
  try {
    let query = supabase
      .from('products')
      .select(`
        *,
        variants:products!parent_id(
          id,
          name,
          price,
          monthly_price,
          image_url,
          image_urls,
          selected_attributes,
          parent_id,
          is_variation,
          stock
        ),
        variant_combination_prices(
          id,
          attributes,
          price,
          monthly_price,
          stock
        )
      `)
      .eq('is_variation', false)
      .order('created_at', { ascending: false });

    // Only include admin-only products if explicitly requested
    if (!options.includeAdminOnly) {
      query = query.eq('admin_only', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('📦 getProducts - Error:', error);
      throw error;
    }

    console.log('📦 getProducts - Success:', data?.length || 0, 'products loaded');
    return data || [];
  } catch (error) {
    console.error('📦 getProducts - Exception:', error);
    throw error;
  }
};

export const getProductById = async (id: string): Promise<Product | null> => {
  console.log('📦 getProductById - Fetching product:', id);
  
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        variants:products!parent_id(
          id,
          name,
          price,
          monthly_price,
          image_url,
          image_urls,
          selected_attributes,
          parent_id,
          is_variation,
          stock
        ),
        variant_combination_prices(
          id,
          attributes,
          price,
          monthly_price,
          stock
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('📦 getProductById - Error:', error);
      throw error;
    }

    console.log('📦 getProductById - Success:', data?.name);
    return data;
  } catch (error) {
    console.error('📦 getProductById - Exception:', error);
    throw error;
  }
};

export const createProduct = async (productData: Partial<Product>): Promise<Product> => {
  console.log('📦 createProduct - Creating product:', productData.name);
  
  try {
    // Ensure image synchronization
    const data = { ...productData };
    
    // If image_urls is provided, ensure image_url is the first one
    if (data.image_urls && Array.isArray(data.image_urls) && data.image_urls.length > 0) {
      if (!data.image_url) {
        data.image_url = data.image_urls[0];
      }
    }
    
    // If image_url is provided but image_urls is not, create image_urls array
    if (data.image_url && !data.image_urls) {
      data.image_urls = [data.image_url];
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('📦 createProduct - Error:', error);
      throw error;
    }

    console.log('📦 createProduct - Success:', product.name);
    return product;
  } catch (error) {
    console.error('📦 createProduct - Exception:', error);
    throw error;
  }
};

export const updateProduct = async (id: string, updates: Partial<Product>): Promise<Product> => {
  console.log('📦 updateProduct - Updating product:', id, updates);
  
  try {
    // Ensure image synchronization
    const data = { ...updates };
    
    // If image_urls is being updated, ensure image_url is the first one
    if (data.image_urls && Array.isArray(data.image_urls) && data.image_urls.length > 0) {
      if (!data.image_url) {
        data.image_url = data.image_urls[0];
      }
    }
    
    // If image_url is being updated but image_urls is not, create image_urls array
    if (data.image_url && !data.image_urls) {
      data.image_urls = [data.image_url];
    }

    const { data: product, error } = await supabase
      .from('products')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('📦 updateProduct - Error:', error);
      throw error;
    }

    console.log('📦 updateProduct - Success:', product.name);
    return product;
  } catch (error) {
    console.error('📦 updateProduct - Exception:', error);
    throw error;
  }
};

export const deleteProduct = async (id: string): Promise<void> => {
  console.log('📦 deleteProduct - Deleting product:', id);
  
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('📦 deleteProduct - Error:', error);
      throw error;
    }

    console.log('📦 deleteProduct - Success');
  } catch (error) {
    console.error('📦 deleteProduct - Exception:', error);
    throw error;
  }
};
