import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/catalog';

export const getProducts = async (companyId: string): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', companyId);

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
