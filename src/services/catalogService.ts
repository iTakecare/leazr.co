import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/catalog';

export const getProducts = async (companyIdOrOptions: string | boolean | { includeAdminOnly?: boolean } = {}): Promise<Product[]> => {
  try {
    let companyId: string = '';
    let includeAdminOnly = false;

    if (typeof companyIdOrOptions === 'string') {
      companyId = companyIdOrOptions;
    } else if (typeof companyIdOrOptions === 'boolean') {
      includeAdminOnly = companyIdOrOptions;
      // Get companyId from auth or context
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      companyId = user.user_metadata?.company_id || '';
    } else if (typeof companyIdOrOptions === 'object') {
      includeAdminOnly = companyIdOrOptions.includeAdminOnly || false;
      // Get companyId from auth or context
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      companyId = user.user_metadata?.company_id || '';
    }

    if (!companyId) return [];

    let query = supabase
      .from('products')
      .select('*')
      .eq('company_id', companyId);

    if (!includeAdminOnly) {
      query = query.or('admin_only.is.null,admin_only.eq.false');
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
};

export const getProductById = async (productId: string): Promise<Product | null> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        variants (
          id,
          name,
          attributes,
          price,
          monthly_price,
          image_url,
          image_urls
        ),
        variant_combination_prices (
          id,
          attributes,
          price,
          monthly_price,
          stock
        )
      `)
      .eq('id', productId)
      .single();

    if (error) {
      throw error;
    }

    return data || null;
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    return null;
  }
};

export const getPublicProducts = async (companyId: string): Promise<Product[]> => {
  console.log('📱 CATALOG SERVICE - Getting public products for company:', companyId);
  
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', companyId)
      .eq('active', true)
      .or('admin_only.is.null,admin_only.eq.false');

    if (error) {
      console.error('❌ CATALOG SERVICE - Error fetching public products:', error);
      throw error;
    }

    console.log('✅ CATALOG SERVICE - Public products found:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('❌ CATALOG SERVICE - Error in getPublicProducts:', error);
    throw error;
  }
};

export const getPublicProductById = async (productId: string, companyId?: string): Promise<Product | null> => {
  console.log('🔍 CATALOG SERVICE - Getting public product by ID:', { productId, companyId });
  
  try {
    let query = supabase
      .from('products')
      .select(`
        *,
        variant_combination_prices (
          id,
          attributes,
          price,
          monthly_price,
          stock
        )
      `)
      .eq('id', productId)
      .eq('active', true)
      .or('admin_only.is.null,admin_only.eq.false');

    // Si on a un companyId, filtrer par entreprise
    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('❌ CATALOG SERVICE - Error fetching public product:', error);
      throw error;
    }

    if (!data) {
      console.log('⚠️ CATALOG SERVICE - No public product found for ID:', productId);
      return null;
    }

    console.log('✅ CATALOG SERVICE - Public product found:', {
      id: data.id,
      name: data.name,
      brand: data.brand,
      hasVariantPrices: data.variant_combination_prices?.length > 0
    });

    return data;
  } catch (error) {
    console.error('❌ CATALOG SERVICE - Error in getPublicProductById:', error);
    throw error;
  }
};

// Product management functions
export const createProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> => {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const addProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> => {
  return createProduct(product);
};

export const updateProduct = async (productId: string, updates: Partial<Product>): Promise<Product> => {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', productId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteProduct = async (productId: string): Promise<void> => {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) throw error;
};

export const duplicateProduct = async (productId: string): Promise<Product> => {
  const original = await getProductById(productId);
  if (!original) throw new Error('Product not found');
  
  const { id, ...productData } = original;
  return createProduct({
    ...productData,
    name: `${productData.name} (Copy)`,
  });
};

// Brand management functions
export const getBrands = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('brands')
    .select('*');

  if (error) throw error;
  return data || [];
};

export const addBrand = async (brand: { name: string; translation: string }): Promise<any> => {
  const { data, error } = await supabase
    .from('brands')
    .insert(brand)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateBrand = async (updates: { originalName: string; name: string; translation: string }): Promise<any> => {
  const { data, error } = await supabase
    .from('brands')
    .update({ name: updates.name, translation: updates.translation })
    .eq('name', updates.originalName)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteBrand = async (params: { name: string }): Promise<void> => {
  const { error } = await supabase
    .from('brands')
    .delete()
    .eq('name', params.name);

  if (error) throw error;
};

// Category management functions
export const getCategories = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*');

  if (error) throw error;
  return data || [];
};

export const addCategory = async (category: { name: string; translation: string }): Promise<any> => {
  const { data, error } = await supabase
    .from('categories')
    .insert(category)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateCategory = async (updates: { originalName: string; name: string; translation: string }): Promise<any> => {
  const { data, error } = await supabase
    .from('categories')
    .update({ name: updates.name, translation: updates.translation })
    .eq('name', updates.originalName)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteCategory = async (params: { name: string }): Promise<void> => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('name', params.name);

  if (error) throw error;
};

// File upload and variant functions
export const uploadProductImage = async (file: File, productIdOrEditingMode?: string | boolean, folderOrIsMain?: string | boolean): Promise<string> => {
  let productId = '';
  let isMain = false;
  let folder = '';
  
  if (typeof productIdOrEditingMode === 'string') {
    productId = productIdOrEditingMode;
  }
  
  if (typeof folderOrIsMain === 'boolean') {
    isMain = folderOrIsMain;
  } else if (typeof folderOrIsMain === 'string') {
    folder = folderOrIsMain;
  }
  
  const fileExt = file.name.split('.').pop();
  const fileName = `${productId || 'temp'}-${Date.now()}.${fileExt}`;
  const path = folder ? `${folder}/${fileName}` : fileName;
  
  const { error } = await supabase.storage
    .from('product-images')
    .upload(path, file);

  if (error) throw error;
  
  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(path);
    
  return data.publicUrl;
};

export const findVariantByAttributes = async (productId: string, attributes: Record<string, string>): Promise<any> => {
  const { data, error } = await supabase
    .from('variant_combination_prices')
    .select('*')
    .eq('product_id', productId)
    .eq('attributes', JSON.stringify(attributes))
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const convertProductToParent = async (productId: string, modelNameOrShouldConvert?: string | boolean): Promise<Product> => {
  let shouldConvert = true;
  let updates: any = { is_parent: true };
  
  if (typeof modelNameOrShouldConvert === 'boolean') {
    shouldConvert = modelNameOrShouldConvert;
    updates = { is_parent: shouldConvert };
  } else if (typeof modelNameOrShouldConvert === 'string') {
    updates = { is_parent: true, model: modelNameOrShouldConvert };
  }
  
  return updateProduct(productId, updates);
};
