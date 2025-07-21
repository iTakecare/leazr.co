import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/catalog';

// Brand Management
export const getBrands = async () => {
  const { data, error } = await supabase.from('brands').select('*');
  if (error) throw error;
  return data || [];
};

export const addBrand = async (brand: { name: string; translation: string }) => {
  const { data, error } = await supabase.from('brands').insert(brand).select().single();
  if (error) throw error;
  return data;
};

export const updateBrand = async (params: { originalName: string; name: string; translation: string }) => {
  const { data, error } = await supabase
    .from('brands')
    .update({ name: params.name, translation: params.translation })
    .eq('name', params.originalName)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteBrand = async (params: { name: string }) => {
  const { error } = await supabase.from('brands').delete().eq('name', params.name);
  if (error) throw error;
  return true;
};

// Category Management
export const getCategories = async () => {
  const { data, error } = await supabase.from('categories').select('*');
  if (error) throw error;
  return data || [];
};

export const addCategory = async (category: { name: string; translation: string }) => {
  const { data, error } = await supabase.from('categories').insert(category).select().single();
  if (error) throw error;
  return data;
};

export const updateCategory = async (params: { originalName: string; name: string; translation: string }) => {
  const { data, error } = await supabase
    .from('categories')
    .update({ name: params.name, translation: params.translation })
    .eq('name', params.originalName)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteCategory = async (params: { name: string }) => {
  const { error } = await supabase.from('categories').delete().eq('name', params.name);
  if (error) throw error;
  return true;
};

// Product Management Functions
export const createProduct = async (product: Partial<Product>) => {
  const { data, error } = await supabase.from('products').insert(product).select().single();
  if (error) throw error;
  return data;
};

export const addProduct = async (product: Partial<Product>) => {
  return createProduct(product);
};

export const updateProduct = async (productId: string, updates: Partial<Product>) => {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', productId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteProduct = async (productId: string) => {
  const { error } = await supabase.from('products').delete().eq('id', productId);
  if (error) throw error;
  return true;
};

export const duplicateProduct = async (productId: string) => {
  const product = await getProductById(productId);
  if (!product) throw new Error('Product not found');
  
  // Remove database-specific fields
  const { id, ...productData } = product;
  const duplicatedProduct = {
    ...productData,
    name: `${product.name} (Copie)`,
    sku: `${product.sku || ''}-copy`
  };
  
  return createProduct(duplicatedProduct);
};

export const uploadProductImage = async (file: File, productId?: string, isMainImage?: boolean) => {
  const fileName = `${productId || Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from('products')
    .upload(fileName, file);
  
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('products')
    .getPublicUrl(fileName);
  
  return publicUrl;
};

export const findVariantByAttributes = async (productId: string, attributes: Record<string, string>) => {
  const { data, error } = await supabase
    .from('variant_combination_prices')
    .select('*')
    .eq('product_id', productId)
    .eq('attributes', JSON.stringify(attributes))
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const convertProductToParent = async (productId: string, modelName?: string) => {
  const updates: any = { is_parent: true };
  if (modelName) {
    updates.model = modelName;
  }
  
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', productId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Overloaded getProducts function for backward compatibility
export const getProducts = async (companyIdOrOptions?: string | boolean | { includeAdminOnly: boolean }): Promise<Product[]> => {
  try {
    let query = supabase.from('products').select('*');
    
    // Handle different parameter types
    if (typeof companyIdOrOptions === 'object' && companyIdOrOptions !== null) {
      // Object with includeAdminOnly property
      if (!companyIdOrOptions.includeAdminOnly) {
        query = query.or('admin_only.is.null,admin_only.eq.false');
      }
    } else if (typeof companyIdOrOptions === 'boolean') {
      // Direct boolean (old usage)
      if (!companyIdOrOptions) {
        query = query.or('admin_only.is.null,admin_only.eq.false');
      }
    } else if (typeof companyIdOrOptions === 'string') {
      // New usage with companyId
      query = query.eq('company_id', companyIdOrOptions);
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

// Legacy function for backward compatibility
export const getProductsWithCompanyId = async (companyId: string): Promise<Product[]> => {
  return getProducts(companyId);
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
          stock,
          sku
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
          stock,
          sku
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
