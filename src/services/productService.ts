
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/catalog";
import { findProductBySlug } from "@/lib/utils";

export const findProductBySlugInCompany = async (
  companyId: string, 
  productSlug: string
): Promise<Product | null> => {
  try {
    console.log('🔍 Searching for product by slug:', { companyId, productSlug });
    
    // Récupérer tous les produits de l'entreprise avec les données de marque via JOIN
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        brands!inner(id, name, translation),
        categories!inner(id, name, translation),
        product_variant_prices!left(
          id,
          attributes,
          price,
          monthly_price,
          stock
        )
      `)
      .eq('company_id', companyId)
      .eq('active', true);

    if (error) {
      console.error('❌ Error fetching products for slug search:', error);
      throw error;
    }

    if (!products || products.length === 0) {
      console.log('📦 No products found for company:', companyId);
      return null;
    }

    console.log(`📦 Found ${products.length} products, searching for slug: ${productSlug}`);
    
    // Mapper les données pour utiliser les bons noms de marques et catégories
    const mappedProducts = products.map(product => {
      const variantPrices = product.product_variant_prices || [];
      
      const mappedProduct = {
        ...product,
        brand: product.brands?.name || product.brand || '',
        category: product.categories?.name || product.category || '',
        brand_id: product.brand_id,
        category_id: product.category_id,
        variant_combination_prices: variantPrices,
        createdAt: product.created_at || new Date(),
        updatedAt: product.updated_at || new Date()
      };

      console.log(`📦 Product mapped: "${mappedProduct.name}" (brand: "${mappedProduct.brand}")`);
      return mappedProduct;
    }) as Product[];
    
    // Log des produits pour débugger avec les marques correctement mappées
    mappedProducts.forEach((product, index) => {
      console.log(`Product ${index + 1}: "${product.name}" (brand: "${product.brand}")`);
    });
    
    // Utiliser la fonction utilitaire pour trouver le produit par slug
    const foundProduct = findProductBySlug(mappedProducts, productSlug);
    
    if (foundProduct) {
      console.log('✅ Product found by slug:', foundProduct.name);
      console.log('✅ Product brand:', foundProduct.brand);
    } else {
      console.log('❌ No product found for slug:', productSlug);
      console.log('❌ Available products with their generated slugs:');
      mappedProducts.forEach(product => {
        const generatedSlug = findProductBySlug([product], ''); // This will show the slug generation
        console.log(`  - ${product.name} (${product.brand}) -> would generate slug with brand: ${product.brand}`);
      });
    }
    
    return foundProduct;
  } catch (error) {
    console.error('❌ Error in findProductBySlugInCompany:', error);
    return null;
  }
};
