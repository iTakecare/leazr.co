import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/catalog";

export const getProductById = async (productId: string): Promise<Product | null> => {
  try {
    console.log('🔍 Fetching product by ID:', productId);
    
    // Récupérer le produit principal
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .maybeSingle();

    if (productError) {
      console.error('❌ Error fetching product by ID:', productError);
      throw productError;
    }

    if (!product) {
      console.log('📦 No product found with ID:', productId);
      return null;
    }

    // Récupérer les prix des variantes depuis product_variant_prices
    const { data: variantPrices, error: variantError } = await supabase
      .from('product_variant_prices')
      .select('*')
      .eq('product_id', productId);

    if (variantError) {
      console.error('❌ Error fetching variant prices:', variantError);
      // Ne pas faire échouer la requête si les variantes ne peuvent pas être récupérées
    }

    // Mapper les prix des variantes vers variant_combination_prices
    const variant_combination_prices = variantPrices?.map(vp => ({
      id: vp.id,
      product_id: vp.product_id,
      attributes: vp.attributes || {},
      price: vp.price || 0,
      monthly_price: vp.monthly_price || 0,
      stock: vp.stock || null,
      created_at: vp.created_at,
      updated_at: vp.updated_at
    })) || [];

    console.log('✅ Product found:', product.name);
    console.log('📊 Variant prices found:', variant_combination_prices.length);
    
    // Retourner le produit avec les variantes mappées
    return {
      ...product,
      variant_combination_prices
    } as Product;
  } catch (error) {
    console.error('❌ Error in getProductById:', error);
    return null;
  }
};

export const getAllProducts = async (options?: { includeAdminOnly?: boolean } | string): Promise<Product[]> => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*');

    if (error) {
      console.error('Error fetching products:', error);
      throw error;
    }

    return products as Product[];
  } catch (error) {
    console.error('Error in getAllProducts:', error);
    return [];
  }
};

// Alias for compatibility
export const getProducts = getAllProducts;

export const getPublicProducts = async (options?: { includeAdminOnly?: boolean } | string): Promise<Product[]> => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('active', true);

    if (error) {
      console.error('Error fetching public products:', error);
      throw error;
    }

    return products as Product[];
  } catch (error) {
    console.error('Error in getPublicProducts:', error);
    return [];
  }
};

export const createProduct = async (product: Partial<Product>): Promise<Product> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

export const addProduct = createProduct;

export const updateProduct = async (id: string, updates: Partial<Product>): Promise<Product> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

export const deleteProduct = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    return false;
  }
};

export const duplicateProduct = async (id: string): Promise<Product> => {
  try {
    const original = await getProductById(id);
    if (!original) throw new Error('Product not found');
    
    const { id: _, ...productData } = original;
    const duplicate = await createProduct({
      ...productData,
      name: `${original.name} (Copie)`
    });
    
    return duplicate;
  } catch (error) {
    console.error('Error duplicating product:', error);
    throw error;
  }
};

export const convertProductToParent = async (id: string, modelName?: string): Promise<Product> => {
  return updateProduct(id, { has_variants: true, name: modelName || undefined });
};

export const uploadProductImage = async (file: File, productId: string, isMain?: boolean, customFileName?: string): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop();
    const finalFileName = customFileName || `${productId}-${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('products')
      .upload(finalFileName, file);

    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('products')
      .getPublicUrl(finalFileName);
      
    return publicUrl;
  } catch (error) {
    console.error('Error uploading product image:', error);
    throw error;
  }
};

export const getBrands = async () => {
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

export const addBrand = async (brand: { name: string; translation: string }) => {
  try {
    const { data, error } = await supabase
      .from('brands')
      .insert(brand)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding brand:', error);
    throw error;
  }
};

export const updateBrand = async (update: { originalName: string; name: string; translation: string }) => {
  try {
    const { data, error } = await supabase
      .from('brands')
      .update({ name: update.name, translation: update.translation })
      .eq('name', update.originalName)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating brand:', error);
    throw error;
  }
};

export const deleteBrand = async (brand: { name: string }) => {
  try {
    const { error } = await supabase
      .from('brands')
      .delete()
      .eq('name', brand.name);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting brand:', error);
    throw error;
  }
};

export const getCategories = async () => {
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

export const addCategory = async (category: any) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert(category)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
};

export const updateCategory = async (id: string, updates: any) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

export const deleteCategory = async (id: string) => {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

export const findVariantByAttributes = async (productId: string, attributes: any) => {
  try {
    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', productId)
      .eq('attributes', JSON.stringify(attributes))
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error finding variant:', error);
    return null;
  }
};
