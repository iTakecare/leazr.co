
import { ProductAttributes, Product } from "@/types/catalog";
import { supabase } from "@/integrations/supabase/client";

/**
 * Recherche une variante compatible avec les attributs sélectionnés
 */
export const findVariantForAttributes = async (
  product: Product, 
  selectedAttributes: ProductAttributes
): Promise<{ variant: Product | null, price: number | null }> => {
  // Vérifier si le produit a des combinaisons de prix de variantes
  if (product.id && product.variant_combination_prices && product.variant_combination_prices.length > 0) {
    try {
      // Try to find a price match in variant combinations
      const priceMatch = product.variant_combination_prices.find(combination => {
        // Check if all selected attributes match this combination
        return Object.entries(selectedAttributes).every(([key, value]) => 
          combination.attributes && 
          combination.attributes[key] !== undefined &&
          String(combination.attributes[key]).toLowerCase() === String(value).toLowerCase()
        );
      });
      
      if (priceMatch) {
        // Créer un pseudo-variant avec les informations de prix
        const variant = {
          ...product,
          price: priceMatch.price,
          monthly_price: priceMatch.monthly_price || 0,
          stock: priceMatch.stock,
          // Correctly cast selected attributes to match the expected type
          // This is a special case where we're creating a product with specific attributes
          // not variation options
          selected_attributes: selectedAttributes,
          variant_id: priceMatch.id
        };
        
        return { 
          variant, 
          price: priceMatch.monthly_price || priceMatch.price 
        };
      }
    } catch (error) {
      console.error("Erreur lors de la recherche de combinaison de prix:", error);
    }
  }
  
  // Si le produit a des variantes enfants
  if (product.variants && product.variants.length > 0) {
    // Rechercher une variante qui correspond aux attributs sélectionnés
    const matchingVariant = product.variants.find(variant => {
      if (!variant.variation_attributes) return false;
      
      // Vérifier que tous les attributs sélectionnés correspondent à cette variante
      return Object.entries(selectedAttributes).every(([key, value]) => 
        variant.variation_attributes && 
        variant.variation_attributes[key] !== undefined &&
        String(variant.variation_attributes[key]).toLowerCase() === String(value).toLowerCase()
      );
    });
    
    if (matchingVariant) {
      return { 
        variant: matchingVariant, 
        price: matchingVariant.monthly_price || null 
      };
    }
  }
  
  // Si le parent est un "parent_id" et non l'ID du produit
  if (product.parent_id) {
    try {
      // Rechercher parmi les autres variantes avec le même parent
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('parent_id', product.parent_id);
      
      if (data && data.length > 0) {
        const matchingVariant = data.find(variant => {
          if (!variant.variation_attributes) return false;
          
          return Object.entries(selectedAttributes).every(([key, value]) => 
            variant.variation_attributes && 
            variant.variation_attributes[key] !== undefined &&
            String(variant.variation_attributes[key]).toLowerCase() === String(value).toLowerCase()
          );
        });
        
        if (matchingVariant) {
          return { 
            variant: matchingVariant as unknown as Product, 
            price: matchingVariant.monthly_price || null 
          };
        }
      }
    } catch (error) {
      console.error("Erreur lors de la recherche de variantes:", error);
    }
  }
  
  // Si aucune variante n'est trouvée, retourner le produit initial avec les attributs sélectionnés
  return { 
    variant: {
      ...product,
      selected_attributes: selectedAttributes
    }, 
    price: null 
  };
};

// Helper function to find variant price combinations
export const findVariantCombinationPrice = async (
  productId: string,
  attributes: ProductAttributes
) => {
  try {
    const { data, error } = await supabase
      .from('product_variant_prices')
      .select('*')
      .eq('product_id', productId);
    
    if (error) throw error;
    
    if (!data || data.length === 0) return null;
    
    // Find a price combination that matches all selected attributes
    return data.find(combination => {
      const combinationAttrs = typeof combination.attributes === 'string'
        ? JSON.parse(combination.attributes)
        : combination.attributes;
        
      // Check if all selected attributes match this combination
      return Object.entries(attributes).every(([key, value]) => 
        combinationAttrs[key] !== undefined &&
        String(combinationAttrs[key]).toLowerCase() === String(value).toLowerCase()
      );
    }) || null;
  } catch (error) {
    console.error("Error finding variant combination price:", error);
    return null;
  }
};
