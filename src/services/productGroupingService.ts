
import { supabase } from "@/integrations/supabase/client";
import { Product, ProductAttributes, ProductVariationAttributes } from "@/types/catalog";
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';

/**
 * Analyzes product names to extract potential attributes for variants
 * @param name The product name to analyze
 * @returns Object with base name and extracted attributes
 */
export function analyzeProductName(name: string): { 
  baseName: string; 
  attributes: Record<string, string>;
} {
  // Pattern: Base name - attribute1, attribute2, etc.
  const pattern = /^(.+?)(?:\s+-\s+(.+))?$/;
  const match = name.match(pattern);
  
  const result = {
    baseName: name,
    attributes: {} as Record<string, string>
  };
  
  if (match && match[2]) {
    // We found a pattern with attributes after dash
    result.baseName = match[1].trim();
    
    // Split attributes by comma if multiple
    const attributesText = match[2].trim();
    const attributeParts = attributesText.split(',').map(p => p.trim());
    
    // Categorize the attributes
    attributeParts.forEach(part => {
      if (part.match(/\d+\s*(?:Go|GB|TB|To)/i)) {
        // Storage attribute
        result.attributes["Stockage"] = part;
      } else if (part.match(/\d+\s*Go\s*RAM/i) || part.match(/\d+\s*GB\s*RAM/i) || 
                 part.match(/^(\d+)Go$/i) || part.match(/^(\d+)GB$/i)) {
        // RAM attribute
        result.attributes["RAM"] = part;
      } else if (part.match(/\d+\s*pouces/i) || part.match(/\d+\s*inch/i) || part.match(/\d+"/i)) {
        // Screen size
        result.attributes["Écran"] = part;
      } else if (part.match(/M\d/i) || part.match(/i[3579]/i) || 
                 part.match(/Ryzen/i) || part.match(/AMD/i) || part.match(/Intel/i)) {
        // Processor type
        result.attributes["Processeur"] = part;
      } else if (part.match(/Pro|Max|Ultra|Air/i)) {
        // Model variant
        result.attributes["Modèle"] = part;
      } else if (part.match(/MacOS|Windows|Linux/i)) {
        // OS
        result.attributes["OS"] = part;
      } else {
        // Unknown attribute type, use generic key
        const existingKeys = Object.keys(result.attributes).length;
        result.attributes[`Attribut_${existingKeys + 1}`] = part;
      }
    });
  }
  
  return result;
}

/**
 * Get products that could be grouped together based on similar names
 */
export async function identifyProductGroups(): Promise<Map<string, Product[]>> {
  try {
    // Fetch all products
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('name');
    
    if (error) {
      console.error("Error fetching products:", error);
      toast.error("Erreur lors de la récupération des produits");
      return new Map();
    }
    
    if (!products || products.length === 0) {
      toast.info("Aucun produit trouvé");
      return new Map();
    }
    
    // Group products by their base name
    const productGroups = new Map<string, Product[]>();
    
    for (const product of products) {
      const { baseName } = analyzeProductName(product.name);
      
      if (!productGroups.has(baseName)) {
        productGroups.set(baseName, []);
      }
      
      productGroups.get(baseName)?.push(product);
    }
    
    // Filter out groups with only one product
    for (const [baseName, group] of [...productGroups.entries()]) {
      if (group.length <= 1) {
        productGroups.delete(baseName);
      }
    }
    
    return productGroups;
  } catch (error) {
    console.error("Error identifying product groups:", error);
    toast.error("Erreur lors de l'analyse des produits");
    return new Map();
  }
}

/**
 * Organize a group of products into a parent-child relationship with variants
 */
export async function organizeProductGroup(
  products: Product[], 
  baseGroupName: string
): Promise<{success: boolean; parentId: string | null}> {
  try {
    if (products.length === 0) {
      throw new Error("Aucun produit à organiser");
    }
    
    // Check if there's already a parent
    const existingParent = products.find(p => p.is_parent);
    let parentId: string | null = null;
    
    if (existingParent) {
      console.log(`Parent exists for ${baseGroupName}: ${existingParent.id}`);
      parentId = existingParent.id;
    } else {
      // Create a parent product
      const parentProduct: Partial<Product> = {
        name: baseGroupName,
        description: products[0].description,
        brand: products[0].brand,
        category: products[0].category,
        price: 0, // Will be updated with the average or lowest price
        image_url: products[0].image_url || products[0].imageUrl,
        active: true,
        is_parent: true,
        model: baseGroupName
      };
      
      // Calculate average price if needed
      if (products.some(p => p.price > 0)) {
        const validPrices = products.filter(p => p.price > 0).map(p => p.price);
        parentProduct.price = validPrices.reduce((sum, price) => sum + price, 0) / validPrices.length;
      }
      
      const { data: newParent, error: parentError } = await supabase
        .from('products')
        .insert([parentProduct])
        .select('*')
        .single();
      
      if (parentError || !newParent) {
        console.error("Error creating parent product:", parentError);
        throw new Error("Erreur lors de la création du produit parent");
      }
      
      parentId = newParent.id;
      console.log(`Created parent for ${baseGroupName}: ${parentId}`);
    }
    
    if (!parentId) {
      throw new Error("Impossible de créer ou d'identifier le produit parent");
    }
    
    // Extract all unique variation attributes across all products
    const variationAttributes: ProductVariationAttributes = {};
    
    for (const product of products) {
      if (product.id === parentId) continue;
      
      const { attributes } = analyzeProductName(product.name);
      
      // Add attributes to variation attributes
      Object.entries(attributes).forEach(([key, value]) => {
        if (!variationAttributes[key]) {
          variationAttributes[key] = [];
        }
        
        if (!variationAttributes[key].includes(value)) {
          variationAttributes[key].push(value);
        }
      });
    }
    
    // Update parent with variation attributes
    await supabase
      .from('products')
      .update({
        variation_attributes: variationAttributes
      })
      .eq('id', parentId);
    
    // Update all child products
    const childIds: string[] = [];
    
    for (const product of products) {
      if (product.id === parentId) continue;
      
      const { attributes } = analyzeProductName(product.name);
      
      // Update the product
      await supabase
        .from('products')
        .update({
          parent_id: parentId,
          is_variation: true,
          is_parent: false,
          variation_attributes: attributes
        })
        .eq('id', product.id);
      
      childIds.push(product.id);
    }
    
    // Save the variant IDs to the parent
    await supabase
      .from('products')
      .update({
        variants_ids: childIds
      })
      .eq('id', parentId);
    
    toast.success(`Groupe de produits "${baseGroupName}" organisé avec succès`);
    return { success: true, parentId };
  } catch (error) {
    console.error("Error organizing product group:", error);
    toast.error(`Erreur: ${(error as Error).message}`);
    return { success: false, parentId: null };
  }
}

/**
 * Automatically group and organize all products that appear to be variants
 */
export async function autoGroupAllProducts(): Promise<{
  success: boolean;
  groupsCreated: number;
  productsGrouped: number;
}> {
  try {
    const productGroups = await identifyProductGroups();
    let groupsCreated = 0;
    let productsGrouped = 0;
    
    for (const [baseName, products] of productGroups.entries()) {
      console.log(`Processing group: ${baseName} with ${products.length} products`);
      
      const result = await organizeProductGroup(products, baseName);
      
      if (result.success) {
        groupsCreated++;
        productsGrouped += products.length;
      }
    }
    
    toast.success(`${groupsCreated} groupes de produits créés avec ${productsGrouped} produits organisés`);
    return { success: true, groupsCreated, productsGrouped };
  } catch (error) {
    console.error("Error auto-grouping products:", error);
    toast.error(`Erreur lors du regroupement automatique: ${(error as Error).message}`);
    return { success: false, groupsCreated: 0, productsGrouped: 0 };
  }
}

/**
 * Creates variant combination prices for a product
 */
export async function generateVariantPrices(
  parentId: string
): Promise<{ success: boolean; pricesCreated: number }> {
  try {
    // Get the parent product with its variants
    const { data: parent, error: parentError } = await supabase
      .from('products')
      .select('*')
      .eq('id', parentId)
      .single();
    
    if (parentError || !parent) {
      throw new Error(`Produit parent non trouvé: ${parentId}`);
    }
    
    // Get all variants
    const { data: variants, error: variantsError } = await supabase
      .from('products')
      .select('*')
      .eq('parent_id', parentId);
    
    if (variantsError) {
      throw new Error("Erreur lors de la récupération des variantes");
    }
    
    if (!variants || variants.length === 0) {
      throw new Error("Aucune variante trouvée pour ce produit");
    }
    
    // Create price combinations for each variant
    let pricesCreated = 0;
    
    for (const variant of variants) {
      // Extract attributes from the variant
      const variantAttributes = variant.variation_attributes || {};
      
      if (Object.keys(variantAttributes).length === 0) {
        // Get attributes from name if not already set
        const { attributes } = analyzeProductName(variant.name);
        Object.assign(variantAttributes, attributes);
      }
      
      // Check if this combination already exists
      const { data: existingPrices } = await supabase
        .from('product_variant_prices')
        .select('*')
        .eq('product_id', parentId)
        .filter('attributes', 'eq', variantAttributes);
      
      if (existingPrices && existingPrices.length > 0) {
        console.log(`Price combination already exists for variant: ${variant.id}`);
        continue;
      }
      
      // Create a new price combination
      const priceData = {
        product_id: parentId,
        attributes: variantAttributes,
        price: variant.price || 0,
        monthly_price: variant.monthly_price || 0,
        stock: variant.stock || 0
      };
      
      const { error: insertError } = await supabase
        .from('product_variant_prices')
        .insert([priceData]);
      
      if (insertError) {
        console.error("Error inserting price combination:", insertError);
        continue;
      }
      
      pricesCreated++;
    }
    
    if (pricesCreated > 0) {
      toast.success(`${pricesCreated} combinaisons de prix créées pour le produit "${parent.name}"`);
    } else {
      toast.info("Aucune nouvelle combinaison de prix créée");
    }
    
    return { success: true, pricesCreated };
  } catch (error) {
    console.error("Error generating variant prices:", error);
    toast.error(`Erreur: ${(error as Error).message}`);
    return { success: false, pricesCreated: 0 };
  }
}

/**
 * Create price combinations for all parent products
 */
export async function generateAllVariantPrices(): Promise<{
  success: boolean;
  pricesCreated: number;
}> {
  try {
    // Get all parent products
    const { data: parents, error } = await supabase
      .from('products')
      .select('id, name')
      .eq('is_parent', true);
    
    if (error) {
      throw new Error("Erreur lors de la récupération des produits parents");
    }
    
    if (!parents || parents.length === 0) {
      toast.info("Aucun produit parent trouvé");
      return { success: true, pricesCreated: 0 };
    }
    
    let totalPricesCreated = 0;
    
    for (const parent of parents) {
      const result = await generateVariantPrices(parent.id);
      if (result.success) {
        totalPricesCreated += result.pricesCreated;
      }
    }
    
    return { success: true, pricesCreated: totalPricesCreated };
  } catch (error) {
    console.error("Error generating all variant prices:", error);
    toast.error(`Erreur: ${(error as Error).message}`);
    return { success: false, pricesCreated: 0 };
  }
}
