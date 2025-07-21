
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/catalog";
import { findProductBySlug } from "@/lib/utils";

export const findProductBySlugInCompany = async (
  companyId: string, 
  productSlug: string
): Promise<Product | null> => {
  try {
    console.log('🔍 Searching for product by slug:', { companyId, productSlug });
    
    // Récupérer tous les produits de l'entreprise
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        variants:products!parent_id(*),
        variant_combination_prices(*)
      `)
      .eq('company_id', companyId)
      .eq('active', true); // Correction: utiliser 'active' au lieu de 'is_active'

    if (error) {
      console.error('❌ Error fetching products for slug search:', error);
      throw error;
    }

    if (!products || products.length === 0) {
      console.log('📦 No products found for company:', companyId);
      return null;
    }

    console.log(`📦 Found ${products.length} products, searching for slug: ${productSlug}`);
    
    // Log des produits pour débugger
    products.forEach((product, index) => {
      console.log(`Product ${index + 1}: "${product.name}" (brand: "${product.brand}")`);
    });
    
    // Utiliser la fonction utilitaire pour trouver le produit par slug
    const foundProduct = findProductBySlug(products, productSlug);
    
    if (foundProduct) {
      console.log('✅ Product found by slug:', foundProduct.name);
    } else {
      console.log('❌ No product found for slug:', productSlug);
    }
    
    return foundProduct;
  } catch (error) {
    console.error('❌ Error in findProductBySlugInCompany:', error);
    return null;
  }
};
