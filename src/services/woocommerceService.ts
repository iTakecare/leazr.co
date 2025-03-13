
import { supabase } from "@/integrations/supabase/client";
import { WooCommerceProduct, ImportResult } from "@/types/woocommerce";
import { Product } from "@/types/catalog";

export async function getWooCommerceProducts(
  url: string,
  consumerKey: string,
  consumerSecret: string,
  page = 1,
  perPage = 10
): Promise<WooCommerceProduct[]> {
  try {
    const { data, error } = await supabase.functions.invoke("woocommerce-import", {
      body: {
        action: "getProducts",
        url,
        consumerKey,
        consumerSecret,
        page,
        perPage
      }
    });

    if (error) throw error;
    
    return data.products || [];
  } catch (error) {
    console.error("Error fetching WooCommerce products:", error);
    throw error;
  }
}

export async function importWooCommerceProducts(
  products: WooCommerceProduct[]
): Promise<ImportResult> {
  try {
    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    // Import products one by one to the Supabase database
    for (const wooProduct of products) {
      // Ensure the required fields are present
      if (!wooProduct.name) {
        errors.push(`Product ID ${wooProduct.id} has no name and was skipped`);
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

export async function testWooCommerceConnection(
  url: string,
  consumerKey: string,
  consumerSecret: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke("woocommerce-import", {
      body: {
        action: "testConnection",
        url,
        consumerKey,
        consumerSecret
      }
    });

    if (error) throw error;
    
    return data.success || false;
  } catch (error) {
    console.error("Error testing WooCommerce connection:", error);
    return false;
  }
}
