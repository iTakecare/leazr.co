
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
    const transformedProducts: Partial<Product>[] = products.map((product) => ({
      name: product.name,
      description: product.description,
      price: parseFloat(product.price || product.regular_price || "0"),
      category: product.categories.length > 0 ? product.categories[0].name : "other",
      imageUrl: product.images.length > 0 ? product.images[0].src : undefined,
      specifications: product.attributes.reduce((acc, attr) => {
        acc[attr.name] = attr.options.join(", ");
        return acc;
      }, {} as Record<string, string>),
      active: product.status === "publish",
    }));

    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    // Import products one by one to the Supabase database
    for (const product of transformedProducts) {
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

