import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/catalog";

export const getProductById = async (productId: string): Promise<Product | null> => {
  try {
    console.log('🔍 Fetching product by ID:', productId);
    
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .maybeSingle(); // Changed from .single() to .maybeSingle() to avoid errors when product not found

    if (error) {
      console.error('❌ Error fetching product by ID:', error);
      throw error;
    }

    if (!product) {
      console.log('📦 No product found with ID:', productId);
      return null;
    }

    console.log('✅ Product found:', product.name);
    return product as Product;
  } catch (error) {
    console.error('❌ Error in getProductById:', error);
    return null; // Return null instead of throwing to allow graceful handling
  }
};

export const getAllProducts = async (): Promise<Product[]> => {
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
