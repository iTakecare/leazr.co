
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

export const getPublicProducts = async () => {
  console.log('📦 getPublicProducts - Starting fetch');
  
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
      .eq('is_variation', false)
      .eq('active', true)
      .eq('admin_only', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('📦 getPublicProducts - Error:', error);
      throw error;
    }

    console.log('📦 getPublicProducts - Success:', data?.length || 0, 'products loaded');
    return data || [];
  } catch (error) {
    console.error('📦 getPublicProducts - Exception:', error);
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

// Brand management functions
export const getBrands = async () => {
  console.log('📦 getBrands - Fetching brands');
  
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('name');

    if (error) {
      console.error('📦 getBrands - Error:', error);
      throw error;
    }

    console.log('📦 getBrands - Success:', data?.length || 0, 'brands loaded');
    return data || [];
  } catch (error) {
    console.error('📦 getBrands - Exception:', error);
    throw error;
  }
};

export const addBrand = async (brandData: { name: string; translation: string }) => {
  console.log('📦 addBrand - Adding brand:', brandData.name);
  
  try {
    const { data, error } = await supabase
      .from('brands')
      .insert([brandData])
      .select()
      .single();

    if (error) {
      console.error('📦 addBrand - Error:', error);
      throw error;
    }

    console.log('📦 addBrand - Success:', data.name);
    return data;
  } catch (error) {
    console.error('📦 addBrand - Exception:', error);
    throw error;
  }
};

export const updateBrand = async (data: { originalName: string; name: string; translation: string }) => {
  console.log('📦 updateBrand - Updating brand:', data.originalName, 'to', data.name);
  
  try {
    const { data: brand, error } = await supabase
      .from('brands')
      .update({ name: data.name, translation: data.translation })
      .eq('name', data.originalName)
      .select()
      .single();

    if (error) {
      console.error('📦 updateBrand - Error:', error);
      throw error;
    }

    console.log('📦 updateBrand - Success:', brand.name);
    return brand;
  } catch (error) {
    console.error('📦 updateBrand - Exception:', error);
    throw error;
  }
};

export const deleteBrand = async (data: { name: string }) => {
  console.log('📦 deleteBrand - Deleting brand:', data.name);
  
  try {
    const { error } = await supabase
      .from('brands')
      .delete()
      .eq('name', data.name);

    if (error) {
      console.error('📦 deleteBrand - Error:', error);
      throw error;
    }

    console.log('📦 deleteBrand - Success');
  } catch (error) {
    console.error('📦 deleteBrand - Exception:', error);
    throw error;
  }
};

// Category management functions
export const getCategories = async () => {
  console.log('📦 getCategories - Fetching categories');
  
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('📦 getCategories - Error:', error);
      throw error;
    }

    console.log('📦 getCategories - Success:', data?.length || 0, 'categories loaded');
    return data || [];
  } catch (error) {
    console.error('📦 getCategories - Exception:', error);
    throw error;
  }
};

export const addCategory = async (categoryData: { name: string; translation: string }) => {
  console.log('📦 addCategory - Adding category:', categoryData.name);
  
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert([categoryData])
      .select()
      .single();

    if (error) {
      console.error('📦 addCategory - Error:', error);
      throw error;
    }

    console.log('📦 addCategory - Success:', data.name);
    return data;
  } catch (error) {
    console.error('📦 addCategory - Exception:', error);
    throw error;
  }
};

export const updateCategory = async (id: string, categoryData: { name: string; translation: string }) => {
  console.log('📦 updateCategory - Updating category:', id, categoryData);
  
  try {
    const { data, error } = await supabase
      .from('categories')
      .update(categoryData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('📦 updateCategory - Error:', error);
      throw error;
    }

    console.log('📦 updateCategory - Success:', data.name);
    return data;
  } catch (error) {
    console.error('📦 updateCategory - Exception:', error);
    throw error;
  }
};

export const deleteCategory = async (categoryName: string) => {
  console.log('📦 deleteCategory - Deleting category:', categoryName);
  
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('name', categoryName);

    if (error) {
      console.error('📦 deleteCategory - Error:', error);
      throw error;
    }

    console.log('📦 deleteCategory - Success');
  } catch (error) {
    console.error('📦 deleteCategory - Exception:', error);
    throw error;
  }
};

// Product image upload function
export const uploadProductImage = async (file: File, productId: string): Promise<string> => {
  console.log('📦 uploadProductImage - Uploading image for product:', productId);
  
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${productId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);

    if (uploadError) {
      console.error('📦 uploadProductImage - Upload error:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    console.log('📦 uploadProductImage - Success:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('📦 uploadProductImage - Exception:', error);
    throw error;
  }
};

// Variant functions
export const findVariantByAttributes = async (productId: string, attributes: Record<string, string>) => {
  console.log('📦 findVariantByAttributes - Finding variant:', productId, attributes);
  
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('parent_id', productId)
      .eq('is_variation', true);

    if (error) {
      console.error('📦 findVariantByAttributes - Error:', error);
      throw error;
    }

    // Find matching variant based on attributes
    const matchingVariant = data?.find((variant) => {
      const variantAttributes = variant.selected_attributes || {};
      return Object.keys(attributes).every(key => 
        variantAttributes[key] === attributes[key]
      );
    });

    console.log('📦 findVariantByAttributes - Found variant:', matchingVariant?.name || 'None');
    return matchingVariant || null;
  } catch (error) {
    console.error('📦 findVariantByAttributes - Exception:', error);
    throw error;
  }
};

export const convertProductToParent = async (productId: string) => {
  console.log('📦 convertProductToParent - Converting product:', productId);
  
  try {
    const { data, error } = await supabase
      .from('products')
      .update({
        has_variants: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .select()
      .single();

    if (error) {
      console.error('📦 convertProductToParent - Error:', error);
      throw error;
    }

    console.log('📦 convertProductToParent - Success:', data.name);
    return data;
  } catch (error) {
    console.error('📦 convertProductToParent - Exception:', error);
    throw error;
  }
};
