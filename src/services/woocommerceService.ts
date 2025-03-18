import { supabase, getSupabaseClient } from "@/integrations/supabase/client";
import { WooCommerceProduct, ImportResult } from "@/types/woocommerce";
import { Product } from "@/types/catalog";

// Fonction pour récupérer la configuration WooCommerce de l'utilisateur
export async function getWooCommerceConfig(userId: string) {
  try {
    const { data, error } = await supabase.functions.invoke("woocommerce-config", {
      body: {
        action: "getConfig",
        userId
      }
    });

    if (error) throw error;
    
    return data.config;
  } catch (error) {
    console.error("Error fetching WooCommerce config:", error);
    return null;
  }
}

// Fonction pour sauvegarder la configuration WooCommerce de l'utilisateur
export async function saveWooCommerceConfig(userId: string, configData: {
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
}) {
  try {
    const { data, error } = await supabase.functions.invoke("woocommerce-config", {
      body: {
        action: "saveConfig",
        userId,
        configData
      }
    });

    if (error) throw error;
    
    return data.success;
  } catch (error) {
    console.error("Error saving WooCommerce config:", error);
    return false;
  }
}

// Fonction pour tester la connexion à l'API WooCommerce
export async function testWooCommerceConnection(
  url: string,
  consumerKey: string,
  consumerSecret: string
): Promise<boolean> {
  try {
    console.log("Testing WooCommerce connection with:", { url, consumerKey: consumerKey.slice(0, 5) + '...' });
    
    // Formater l'URL correctement
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const apiUrl = `${baseUrl}/wp-json/wc/v3/products?per_page=1`;
    
    // Ajouter l'authentification Basic
    const credentials = btoa(`${consumerKey}:${consumerSecret}`);
    const headers = new Headers();
    headers.append("Authorization", `Basic ${credentials}`);
    headers.append("Content-Type", "application/json");
    
    // Faire la requête directement depuis le client
    const response = await fetch(apiUrl, {
      method: "GET",
      headers,
    });
    
    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      const responseText = await response.text();
      console.error("Response body:", responseText);
      return false;
    }
    
    const data = await response.json();
    return Array.isArray(data);
  } catch (error) {
    console.error("Error testing WooCommerce connection:", error);
    return false;
  }
}

// Fonction pour récupérer tous les produits WooCommerce avec pagination
export async function fetchAllWooCommerceProducts(
  url: string,
  consumerKey: string,
  consumerSecret: string
): Promise<WooCommerceProduct[]> {
  try {
    console.log("Fetching all WooCommerce products with pagination");
    
    const allProducts: WooCommerceProduct[] = [];
    let page = 1;
    let hasMoreProducts = true;
    const perPage = 100; // Maximum allowed by WooCommerce API
    
    // Formater l'URL correctement
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    
    // Ajouter l'authentification Basic
    const credentials = btoa(`${consumerKey}:${consumerSecret}`);
    const headers = new Headers({
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/json"
    });
    
    while (hasMoreProducts) {
      console.log(`Fetching products page ${page}`);
      const apiUrl = `${baseUrl}/wp-json/wc/v3/products?page=${page}&per_page=${perPage}`;
      
      const response = await fetch(apiUrl, {
        method: "GET",
        headers
      });
      
      if (!response.ok) {
        console.error(`API error on page ${page}: ${response.status} ${response.statusText}`);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const products = await response.json();
      
      if (!Array.isArray(products)) {
        console.error("Invalid products response format:", products);
        throw new Error("Invalid products response format");
      }
      
      if (products.length === 0) {
        // No more products to fetch
        hasMoreProducts = false;
      } else {
        allProducts.push(...products);
        page++;
        
        // Log progress
        console.log(`Retrieved ${allProducts.length} products so far`);
      }
    }
    
    console.log(`Total products retrieved: ${allProducts.length}`);
    return allProducts;
  } catch (error) {
    console.error("Error fetching all WooCommerce products:", error);
    throw error;
  }
}

// Fonction pour récupérer les produits WooCommerce d'une page spécifique
export async function getWooCommerceProducts(
  url: string,
  consumerKey: string,
  consumerSecret: string,
  page = 1,
  perPage = 10
): Promise<WooCommerceProduct[]> {
  try {
    console.log(`Fetching WooCommerce products, page ${page}`);
    
    // Formater l'URL correctement
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const apiUrl = `${baseUrl}/wp-json/wc/v3/products?page=${page}&per_page=${perPage}`;
    
    // Ajouter l'authentification Basic
    const credentials = btoa(`${consumerKey}:${consumerSecret}`);
    const headers = new Headers();
    headers.append("Authorization", `Basic ${credentials}`);
    headers.append("Content-Type", "application/json");
    
    // Faire la requête directement depuis le client
    const response = await fetch(apiUrl, {
      method: "GET",
      headers,
    });
    
    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      const responseText = await response.text();
      console.error("Response body:", responseText);
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const products = await response.json();
    
    if (!Array.isArray(products)) {
      console.error("Invalid products response format:", products);
      throw new Error("Invalid products response format");
    }
    
    console.log(`Retrieved ${products.length} products on page ${page}`);
    return products;
  } catch (error) {
    console.error("Error fetching WooCommerce products:", error);
    throw error;
  }
}

// Fonction pour récupérer les variations d'un produit
export async function getProductVariations(
  url: string,
  consumerKey: string,
  consumerSecret: string,
  productId: number
): Promise<WooCommerceProduct[]> {
  try {
    console.log(`Fetching variations for product ${productId}`);
    
    // Formater l'URL correctement
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const apiUrl = `${baseUrl}/wp-json/wc/v3/products/${productId}/variations?per_page=100`;
    
    // Ajouter l'authentification Basic
    const credentials = btoa(`${consumerKey}:${consumerSecret}`);
    const headers = new Headers();
    headers.append("Authorization", `Basic ${credentials}`);
    headers.append("Content-Type", "application/json");
    
    // Faire la requête directement depuis le client
    const response = await fetch(apiUrl, {
      method: "GET",
      headers,
    });
    
    if (!response.ok) {
      console.error(`API error fetching variations: ${response.status} ${response.statusText}`);
      const responseText = await response.text();
      console.error("Response body:", responseText);
      return [];
    }
    
    const variations = await response.json();
    
    if (!Array.isArray(variations)) {
      console.error("Invalid variations response format:", variations);
      return [];
    }
    
    console.log(`Retrieved ${variations.length} variations for product ${productId}`);
    return variations;
  } catch (error) {
    console.error(`Error fetching variations for product ${productId}:`, error);
    return [];
  }
}

// Improved function to download and upload an image
async function downloadAndUploadImage(imageUrl: string, productId: string): Promise<string | null> {
  try {
    if (!imageUrl) {
      console.error("No image URL provided");
      return null;
    }
    
    console.log(`Processing image: ${imageUrl} for product: ${productId}`);
    
    // For WooCommerce imports, always return the original URL to prevent storage permission issues
    // This ensures that images are displayed correctly even if storage upload fails
    return imageUrl;
    
    // The code below is kept but not used to avoid storage permission issues
    /*
    // Importer le service de stockage
    const { downloadAndUploadImage } = await import("@/services/storageService");
    
    // Generate a unique path for the image
    const timestamp = Date.now();
    const extension = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
    const path = `${productId}/${timestamp}.${extension}`;
    
    // Upload the image with preservation of original name for SEO
    const result = await downloadAndUploadImage(imageUrl, path, 'product-images');
    
    if (!result) {
      console.error("Failed to upload image, fallback to original URL", imageUrl);
      return imageUrl;
    }
    
    console.log(`Successfully uploaded image to: ${result}`);
    return result;
    */
  } catch (error) {
    console.error("Error in downloadAndUploadImage:", error);
    // En cas d'erreur, retourner l'URL d'origine
    return imageUrl;
  }
}

// Fonction pour importer les produits dans Supabase
export async function importWooCommerceProducts(
  products: WooCommerceProduct[],
  includeVariations: boolean = true,
  overwriteExisting: boolean = false
): Promise<ImportResult> {
  try {
    console.log(`Starting import of ${products.length} products with overwriteExisting=${overwriteExisting}`);
    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;
    let variationsImported = 0;
    let variationsSkipped = 0;

    // Check if storage bucket exists, otherwise create it
    await ensureStorageBucketExists();

    // Get all existing products for verification
    const { data: existingProducts, error: fetchError } = await supabase
      .from("products")
      .select("id, name, sku");
    
    if (fetchError) {
      console.error("Error fetching existing products:", fetchError);
      throw fetchError;
    }

    // Create sets for efficient search
    const existingNameSet = new Set<string>();
    const existingSkuSet = new Set<string>();
    const existingIdByName = new Map<string, string>();
    const existingIdBySku = new Map<string, string>();
    
    existingProducts?.forEach(product => {
      const nameLower = product.name.toLowerCase();
      existingNameSet.add(nameLower);
      existingIdByName.set(nameLower, product.id);
      
      if (product.sku) {
        existingSkuSet.add(product.sku.toLowerCase());
        existingIdBySku.set(product.sku.toLowerCase(), product.id);
      }
    });
    
    console.log(`Found ${existingNameSet.size} existing products by name, ${existingSkuSet.size} by SKU`);

    // Separate parent products (with variations) from simple products
    const parentProducts: WooCommerceProduct[] = [];
    const simpleProducts: WooCommerceProduct[] = [];
    
    // First pass: identify parent products
    for (const product of products) {
      if (product.variations && product.variations.length > 0) {
        parentProducts.push(product);
      } else {
        simpleProducts.push(product);
      }
    }
    
    console.log(`Identified ${parentProducts.length} parent products and ${simpleProducts.length} simple products`);
    
    // Process parent products first
    for (const parentProduct of parentProducts) {
      try {
        // Import the parent product
        console.log(`Processing parent product: ${parentProduct.name}`);
        
        // Create the parent product
        const parentData = await createProductFromWooCommerceData(
          parentProduct,
          existingNameSet,
          existingSkuSet,
          existingIdByName,
          existingIdBySku,
          overwriteExisting,
          false, // Not a variation
          null,  // No parent ID
          true   // Is a parent product
        );
        
        if (!parentData) {
          console.log(`Skipped parent product: ${parentProduct.name}`);
          skipped++;
          continue;
        }
        
        console.log(`Imported parent product: ${parentData.name} with ID: ${parentData.id}`);
        imported++;
        
        // Add to existing product sets
        existingNameSet.add(parentProduct.name.toLowerCase());
        existingIdByName.set(parentProduct.name.toLowerCase(), parentData.id);
        if (parentProduct.sku) {
          existingSkuSet.add(parentProduct.sku.toLowerCase());
          existingIdBySku.set(parentProduct.sku.toLowerCase(), parentData.id);
        }
        
        // Process variations if needed
        if (includeVariations && parentProduct.variations && parentProduct.variations.length > 0) {
          console.log(`Fetching ${parentProduct.variations.length} variations for parent product: ${parentProduct.name}`);
          
          // Get variations for this parent product
          const variations = await getProductVariations(
            parentProduct.siteUrl || "https://www.itakecare.be",
            parentProduct.consumerKey || "ck_09a895603eb75cc364669e8e3317fe13e607ace0",
            parentProduct.consumerSecret || "cs_52c6e6aa2332f0d7e1b395ab32c32f75a8ce4ccc",
            parentProduct.id
          );
          
          if (variations.length === 0) {
            console.log(`No variations found for parent product: ${parentProduct.name}`);
            continue;
          }
          
          console.log(`Processing ${variations.length} variations for parent product: ${parentProduct.name}`);
          
          // Store variation IDs to update parent later
          const variationIds: string[] = [];
          
          // Import each variation
          for (const variation of variations) {
            try {
              // Build variation attributes
              const variationAttributes: Record<string, string> = {};
              
              // Extract attributes from the variation
              if (variation.attributes && variation.attributes.length > 0) {
                variation.attributes.forEach(attr => {
                  if (attr.name && attr.option) {
                    variationAttributes[attr.name] = attr.option;
                  }
                });
              }
              
              // Build a descriptive name for the variation based on attributes
              let variationName = parentProduct.name;
              const attributeTexts: string[] = [];
              
              for (const [name, value] of Object.entries(variationAttributes)) {
                attributeTexts.push(`${name}: ${value}`);
              }
              
              if (attributeTexts.length > 0) {
                variationName = `${parentProduct.name} - ${attributeTexts.join(', ')}`;
              }
              
              // Set the name for display
              variation.name = variationName;
              
              // Import the variation as a product with reference to the parent
              const variationData = await createProductFromWooCommerceData(
                variation,
                existingNameSet,
                existingSkuSet,
                existingIdByName,
                existingIdBySku,
                overwriteExisting,
                true, // Is a variation
                parentData.id, // Parent ID
                false, // Not a parent product
                variationAttributes // Variation attributes
              );
              
              if (!variationData) {
                console.log(`Skipped variation: ${variationName}`);
                variationsSkipped++;
                continue;
              }
              
              console.log(`Imported variation: ${variationData.name} with ID: ${variationData.id}`);
              variationIds.push(variationData.id);
              variationsImported++;
              
              // Add to existing product sets
              existingNameSet.add((variation.name || '').toLowerCase());
              existingIdByName.set((variation.name || '').toLowerCase(), variationData.id);
              if (variation.sku) {
                existingSkuSet.add(variation.sku.toLowerCase());
                existingIdBySku.set(variation.sku.toLowerCase(), variationData.id);
              }
            } catch (variationError) {
              console.error(`Error processing variation for ${parentProduct.name}:`, variationError);
              errors.push(`Error with variation of ${parentProduct.name}: ${
                variationError instanceof Error ? variationError.message : 'Unknown error'
              }`);
            }
          }
          
          // Update parent product with variation IDs
          if (variationIds.length > 0) {
            console.log(`Updating parent product ${parentData.name} with ${variationIds.length} variations`);
            
            const { error: updateError } = await supabase
              .from("products")
              .update({
                is_parent: true,
                variants_ids: variationIds
              })
              .eq("id", parentData.id);
              
            if (updateError) {
              console.error(`Error updating parent product with variations: ${updateError.message}`);
              errors.push(`Error updating parent ${parentProduct.name} with variations: ${updateError.message}`);
            } else {
              console.log(`Successfully updated parent product ${parentData.name} with ${variationIds.length} variations`);
            }
          }
        }
      } catch (parentError) {
        console.error(`Error processing parent product ${parentProduct.name}:`, parentError);
        errors.push(`Error with parent product ${parentProduct.name}: ${
          parentError instanceof Error ? parentError.message : 'Unknown error'
        }`);
        skipped++;
      }
    }
    
    // Process simple products
    for (const product of simpleProducts) {
      try {
        const productData = await createProductFromWooCommerceData(
          product,
          existingNameSet,
          existingSkuSet,
          existingIdByName,
          existingIdBySku,
          overwriteExisting
        );
        
        if (!productData) {
          console.log(`Skipped simple product: ${product.name}`);
          skipped++;
          continue;
        }
        
        console.log(`Imported simple product: ${productData.name}`);
        imported++;
        
        // Add to existing product sets
        existingNameSet.add(product.name.toLowerCase());
        existingIdByName.set(product.name.toLowerCase(), productData.id);
        if (product.sku) {
          existingSkuSet.add(product.sku.toLowerCase());
          existingIdBySku.set(product.sku.toLowerCase(), productData.id);
        }
      } catch (productError) {
        console.error(`Error processing simple product ${product.name}:`, productError);
        errors.push(`Error with simple product ${product.name}: ${
          productError instanceof Error ? productError.message : 'Unknown error'
        }`);
        skipped++;
      }
    }

    console.log(`Import completed: ${imported} products imported, ${skipped} skipped`);
    console.log(`${variationsImported} variations imported, ${variationsSkipped} skipped`);
    
    return {
      success: errors.length === 0,
      totalImported: imported + variationsImported,
      skipped: skipped + variationsSkipped,
      variations_count: variationsImported,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error("Error importing WooCommerce products:", error);
    throw error;
  }
}

// Fonction auxiliaire pour créer un produit à partir des données WooCommerce
async function createProductFromWooCommerceData(
  wooProduct: WooCommerceProduct,
  existingNames: Set<string>,
  existingSkus: Set<string>,
  existingIdsByName: Map<string, string>,
  existingIdsBySku: Map<string, string>,
  overwriteExisting: boolean,
  isVariation: boolean = false,
  parentId?: string | null,
  isParent: boolean = false,
  variationAttributes?: Record<string, string>
): Promise<Product | null> {
  if (!wooProduct.name) {
    console.error(`Product ID ${wooProduct.id} has no name and was skipped`);
    return null;
  }

  const productNameLower = wooProduct.name.toLowerCase();
  const productSkuLower = wooProduct.sku ? wooProduct.sku.toLowerCase() : '';
  
  const productExistsByName = existingNames.has(productNameLower);
  const productExistsBySku = productSkuLower && existingSkus.has(productSkuLower);
  const productExists = productExistsByName || productExistsBySku;
  
  // Debug logs to understand the state
  console.log(`Processing product: ${wooProduct.name} (SKU: ${wooProduct.sku || 'None'})`);
  console.log(`Product exists by name: ${productExistsByName}, by SKU: ${productExistsBySku}, Overwrite existing: ${overwriteExisting}`);

  // Check if product exists and we shouldn't overwrite
  if (productExists && !overwriteExisting) {
    console.log(`Product "${wooProduct.name}" already exists and was skipped (overwriteExisting: ${overwriteExisting})`);
    return null;
  }

  // Extract brand and name (if possible)
  let brand = 'Generic';
  let name = wooProduct.name;
  
  // Try to extract brand from the beginning of name
  const brandMatch = name.match(/^([\w\s]+)\s+(.+)$/);
  if (brandMatch) {
    brand = brandMatch[1].trim();
    name = brandMatch[2].trim();
  }

  // Handle images - improved to handle multiple images
  let imageUrl = '';
  const additionalImages: string[] = [];
  
  // Process and upload all available images
  if (wooProduct.images && wooProduct.images.length > 0) {
    console.log(`Product has ${wooProduct.images.length} images`);
    
    // Always use original image URLs from WooCommerce
    // This avoids storage permission issues
    if (wooProduct.images.length > 0 && wooProduct.images[0].src) {
      imageUrl = wooProduct.images[0].src;
    }
    
    // Get additional images (up to 4 more)
    if (wooProduct.images.length > 1) {
      for (let i = 1; i < Math.min(wooProduct.images.length, 5); i++) {
        if (wooProduct.images[i].src) {
          additionalImages.push(wooProduct.images[i].src);
        }
      }
    }
  } else if (isVariation && wooProduct.image && wooProduct.image.src) {
    // Handle variation-specific image
    imageUrl = wooProduct.image.src;
  }

  // Calculate prices
  const price = parseFloat(wooProduct.price || wooProduct.regular_price || "0");

  // Create specifications from attributes
  const specifications = wooProduct.attributes?.reduce((acc, attr) => {
    if (attr.name) {
      acc[attr.name] = Array.isArray(attr.options) 
        ? attr.options.join(", ")
        : attr.option || '';
    }
    return acc;
  }, {} as Record<string, string>) || {};

  // Prepare product data for database - using column names that actually exist in the database
  const productData = {
    name: wooProduct.name,
    description: wooProduct.short_description || wooProduct.description || '',
    price,
    brand,
    category: determineCategory(wooProduct.categories),
    image_url: imageUrl, // Use image_url instead of imageUrl
    image_urls: additionalImages.length > 0 ? additionalImages : undefined,
    specifications: specifications,
    active: wooProduct.status === "publish" || wooProduct.stock_status === "instock",
    is_variation: isVariation,
    is_parent: isParent,
    sku: wooProduct.sku || null,
    parent_id: isVariation && parentId ? parentId : null,
    variation_attributes: variationAttributes || null,
    monthly_price: price * 0.03, // Simplified monthly price calculation
  };

  console.log(`Preparing to ${productExists ? 'update' : 'insert'} product: ${wooProduct.name}`);

  // Determine existing ID if product exists
  let existingId: string | undefined;
  
  if (productExistsByName) {
    existingId = existingIdsByName.get(productNameLower);
  } else if (productExistsBySku) {
    existingId = existingIdsBySku.get(productSkuLower);
  }
  
  // If product exists and we should overwrite, update it
  if (productExists && overwriteExisting && existingId) {
    console.log(`Updating existing product: ${wooProduct.name} with ID: ${existingId}`);
    const { data, error } = await supabase
      .from("products")
      .update(productData)
      .eq("id", existingId)
      .select();

    if (error) {
      console.error(`Failed to update ${wooProduct.name}: ${error.message}`);
      throw error;
    }
    
    console.log(`Successfully updated product: ${wooProduct.name}`);
    return mapDbProductToProduct(data[0]);
  } else {
    // Insert a new product
    console.log(`Inserting new product: ${wooProduct.name}`);
    const { data, error } = await supabase
      .from("products")
      .insert(productData)
      .select();

    if (error) {
      console.error(`Failed to import ${wooProduct.name}: ${error.message}`);
      throw error;
    }
    
    console.log(`Successfully inserted product: ${wooProduct.name}`);
    return mapDbProductToProduct(data[0]);
  }
}

// Fonction pour déterminer la catégorie
function determineCategory(categories?: { id: number; name: string; slug: string }[]): string {
  if (!categories || categories.length === 0) return 'other';
  
  const categoryMap: { [key: string]: string } = {
    'ordinateur': 'desktop',
    'desktop': 'desktop',
    'pc': 'desktop',
    'ordinateur-portable': 'laptop',
    'laptop': 'laptop',
    'portable': 'laptop',
    'tablette': 'tablet',
    'tablet': 'tablet',
    'ipad': 'tablet',
    'telephone': 'smartphone',
    'smartphone': 'smartphone',
    'iphone': 'smartphone',
    'phone': 'smartphone',
    'mobile': 'smartphone',
    'ecran': 'display',
    'moniteur': 'display',
    'display': 'display',
    'accessoire': 'accessory',
    'accessory': 'accessory',
    'peripherique': 'peripheral',
    'peripheral': 'peripheral'
  };
  
  // Vérifier la catégorie la plus spécifique (dernier élément)
  const slug = categories[categories.length - 1].slug;
  
  // Correspondance exacte
  if (categoryMap[slug]) return categoryMap[slug];
  
  // Correspondance partielle
  for (const key in categoryMap) {
    if (slug.includes(key)) return categoryMap[key];
  }
  
  // Vérifier les mots dans le nom de la catégorie
  const words = slug.split('-');
  for (const word of words) {
    if (categoryMap[word]) return categoryMap[word];
  }
  
  // Vérifier les catégories parentes
  if (categories.length > 1) {
    const parentSlug = categories[categories.length - 2].slug;
    if (categoryMap[parentSlug]) return categoryMap[parentSlug];
    
    for (const key in categoryMap) {
      if (parentSlug.includes(key)) return categoryMap[key];
    }
  }
  
  return 'other';
}

// Update the ensureStorageBucketExists function
async function ensureStorageBucketExists() {
  try {
    const { ensureStorageBucket } = await import("@/services/storageService");
    return await ensureStorageBucket('product-images');
  } catch (error) {
    console.error("Error ensuring storage bucket exists:", error);
    return false;
  }
}

// Map a database product to a Product object
const mapDbProductToProduct = (dbProduct: any): Product => {
  return {
    id: dbProduct.id,
    name: dbProduct.name,
    brand: dbProduct.brand || 'Generic',
    price: dbProduct.price || 0,
    monthly_price: dbProduct.monthly_price || 0,
    category: dbProduct.category || 'other',
    description: dbProduct.description || '',
    image_url: dbProduct.image_url || '',
    image_urls: dbProduct.image_urls || [],
    image_alts: dbProduct.image_alts || [],
    active: dbProduct.active !== false,
    specifications: dbProduct.specifications || {},
    created_at: dbProduct.created_at,
    updated_at: dbProduct.updated_at,
    is_parent: dbProduct.is_parent || false,
    is_variation: dbProduct.is_variation || false,
    parent_id: dbProduct.parent_id || null,
    sku: dbProduct.sku || '',
    variation_attributes: dbProduct.variation_attributes || {}
  };
};
