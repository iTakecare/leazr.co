
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

// Fonction pour récupérer les produits WooCommerce
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
    // Formater l'URL correctement
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const apiUrl = `${baseUrl}/wp-json/wc/v3/products/${productId}/variations`;
    
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
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const variations = await response.json();
    
    if (!Array.isArray(variations)) {
      throw new Error("Invalid variations response format");
    }
    
    return variations;
  } catch (error) {
    console.error(`Error fetching variations for product ${productId}:`, error);
    return [];
  }
}

export async function importWooCommerceProducts(
  products: WooCommerceProduct[]
): Promise<ImportResult> {
  try {
    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    // Vérifier les produits existants
    const { data: existingProducts } = await supabase
      .from("products")
      .select("name");
    
    const existingNames = new Set(existingProducts?.map(p => p.name.toLowerCase()) || []);

    // Import products one by one to the Supabase database
    for (const wooProduct of products) {
      // Ensure the required fields are present
      if (!wooProduct.name) {
        errors.push(`Product ID ${wooProduct.id} has no name and was skipped`);
        skipped++;
        continue;
      }

      // Check if product with same name already exists
      if (existingNames.has(wooProduct.name.toLowerCase())) {
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

      const { error } = await supabase
        .from("products")
        .insert(product);

      if (error) {
        errors.push(`Failed to import ${product.name}: ${error.message}`);
        skipped++;
      } else {
        imported++;
      }
    }

    return {
      success: errors.length === 0,
      totalImported: imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error("Error importing WooCommerce products:", error);
    throw error;
  }
}
