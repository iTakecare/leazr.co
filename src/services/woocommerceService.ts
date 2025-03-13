
import { supabase } from "@/integrations/supabase/client";
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

// Fonction pour importer les produits dans Supabase
export async function importWooCommerceProducts(
  products: WooCommerceProduct[],
  includeVariations: boolean = true,
  overwriteExisting: boolean = false
): Promise<ImportResult> {
  try {
    console.log(`Starting import of ${products.length} products`);
    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;
    let variationsImported = 0;
    let variationsSkipped = 0;

    // Vérifier les produits existants
    const { data: existingProducts } = await supabase
      .from("products")
      .select("name");
    
    const existingNames = new Set(existingProducts?.map(p => p.name.toLowerCase()) || []);
    console.log(`Found ${existingNames.size} existing products`);

    // Import products one by one to the Supabase database
    for (const wooProduct of products) {
      // Ensure the required fields are present
      if (!wooProduct.name) {
        errors.push(`Product ID ${wooProduct.id} has no name and was skipped`);
        skipped++;
        continue;
      }

      // Check if product with same name already exists
      if (!overwriteExisting && existingNames.has(wooProduct.name.toLowerCase())) {
        errors.push(`Product "${wooProduct.name}" already exists and was skipped`);
        skipped++;
        continue;
      }

      // Create a properly typed product object that matches Supabase's expectations
      const product = {
        name: wooProduct.name,
        description: wooProduct.description || '',
        price: parseFloat(wooProduct.price || wooProduct.regular_price || "0"),
        category: wooProduct.categories.length > 0 ? wooProduct.categories[0].name : "other",
        image_url: wooProduct.images.length > 0 ? wooProduct.images[0].src : null,
        specifications: wooProduct.attributes.reduce((acc, attr) => {
          acc[attr.name] = attr.options.join(", ");
          return acc;
        }, {} as Record<string, string>),
        active: wooProduct.status === "publish"
      };

      // Si on écrase les existants, on tente d'abord de mettre à jour
      if (overwriteExisting && existingNames.has(wooProduct.name.toLowerCase())) {
        const { error } = await supabase
          .from("products")
          .update(product)
          .eq("name", wooProduct.name);

        if (error) {
          errors.push(`Failed to update ${product.name}: ${error.message}`);
          skipped++;
        } else {
          imported++;
          console.log(`Updated product: ${product.name}`);
        }
      } else {
        // Insertion d'un nouveau produit
        const { error } = await supabase
          .from("products")
          .insert(product);

        if (error) {
          errors.push(`Failed to import ${product.name}: ${error.message}`);
          skipped++;
        } else {
          imported++;
          console.log(`Imported product: ${product.name}`);
          
          // Ajouter le nom à la liste des existants pour éviter les doublons pendant l'importation
          existingNames.add(wooProduct.name.toLowerCase());
        }
      }

      // Import variations if product has them and option is enabled
      if (includeVariations && wooProduct.id) {
        try {
          console.log(`Checking for variations of product ${wooProduct.id}: ${wooProduct.name}`);
          
          // Une fois que le produit parent est importé, récupérer et importer ses variations
          const variations = await getProductVariations(
            // Ces valeurs seraient normalement passées comme paramètres
            "https://www.itakecare.be",
            "ck_09a895603eb75cc364669e8e3317fe13e607ace0",
            "cs_52c6e6aa2332f0d7e1b395ab32c32f75a8ce4ccc",
            wooProduct.id
          );
          
          if (variations.length > 0) {
            console.log(`Found ${variations.length} variations for product ${wooProduct.name}`);
            
            for (const variation of variations) {
              if (!variation.name) {
                // Generate a name from attributes if none exists
                let variationName = wooProduct.name;
                if (variation.attributes && variation.attributes.length > 0) {
                  const attributeNames = variation.attributes
                    .map(attr => attr.option || '')
                    .filter(Boolean)
                    .join(' - ');
                    
                  if (attributeNames) {
                    variationName += ` - ${attributeNames}`;
                  }
                }
                variation.name = variationName;
              }
              
              // Check if this variation name already exists
              if (!overwriteExisting && existingNames.has(variation.name.toLowerCase())) {
                variationsSkipped++;
                continue;
              }
              
              // Create a product object from the variation
              const variationProduct = {
                name: variation.name,
                description: wooProduct.description || '',
                price: parseFloat(variation.price || wooProduct.price || wooProduct.regular_price || "0"),
                category: wooProduct.categories.length > 0 ? wooProduct.categories[0].name : "other",
                image_url: variation.image?.src || (wooProduct.images.length > 0 ? wooProduct.images[0].src : null),
                specifications: [
                  ...wooProduct.attributes,
                  ...(variation.attributes || [])
                ].reduce((acc, attr) => {
                  acc[attr.name] = Array.isArray(attr.options) 
                    ? attr.options.join(", ")
                    : attr.option || '';
                  return acc;
                }, {} as Record<string, string>),
                active: variation.stock_status === "instock" || wooProduct.status === "publish"
              };

              // Import the variation
              const { error } = await supabase
                .from("products")
                .insert(variationProduct);

              if (error) {
                errors.push(`Failed to import variation ${variationProduct.name}: ${error.message}`);
                variationsSkipped++;
              } else {
                variationsImported++;
                console.log(`Imported variation: ${variationProduct.name}`);
                
                // Ajouter le nom à la liste des existants
                existingNames.add(variation.name.toLowerCase());
              }
            }
          }
        } catch (variationError) {
          console.error(`Error processing variations for ${wooProduct.name}:`, variationError);
          errors.push(`Error with variations of ${wooProduct.name}: ${
            variationError instanceof Error ? variationError.message : 'Unknown error'
          }`);
        }
      }
    }

    console.log(`Import completed: ${imported} products and ${variationsImported} variations imported, ${skipped} products and ${variationsSkipped} variations skipped`);
    return {
      success: errors.length === 0,
      totalImported: imported + variationsImported,
      skipped: skipped + variationsSkipped,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error("Error importing WooCommerce products:", error);
    throw error;
  }
}

