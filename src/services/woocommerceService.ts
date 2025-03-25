
import { supabase } from "@/integrations/supabase/client";

/**
 * Test the connection to WooCommerce
 */
export async function testWooCommerceConnection(
  siteUrl: string,
  consumerKey: string,
  consumerSecret: string
): Promise<boolean> {
  try {
    // Call the Edge Function to test the connection
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/woocommerce-import`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: "testConnection",
          url: siteUrl,
          consumerKey,
          consumerSecret,
        }),
      }
    );

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error("Error testing WooCommerce connection:", error);
    return false;
  }
}

/**
 * Get the WooCommerce configuration for a user
 */
export async function getWooCommerceConfig(
  userId: string
): Promise<{ site_url?: string; consumer_key?: string; consumer_secret?: string } | null> {
  try {
    const { data, error } = await supabase
      .from("woocommerce_config")
      .select("site_url, consumer_key, consumer_secret")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error getting WooCommerce config:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error getting WooCommerce config:", error);
    return null;
  }
}

/**
 * Save the WooCommerce configuration for a user
 */
export async function saveWooCommerceConfig(
  userId: string,
  config: { siteUrl: string; consumerKey: string; consumerSecret: string }
): Promise<boolean> {
  try {
    const { error } = await supabase.from("woocommerce_config").upsert(
      {
        user_id: userId,
        site_url: config.siteUrl,
        consumer_key: config.consumerKey,
        consumer_secret: config.consumerSecret,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.error("Error saving WooCommerce config:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error saving WooCommerce config:", error);
    return false;
  }
}

/**
 * Import WooCommerce products
 */
export async function importWooCommerceProducts(
  products: any[],
  includeVariations: boolean,
  overwriteExisting: boolean
): Promise<{
  totalImported: number;
  skipped: number;
  errors: string[];
}> {
  const result = {
    totalImported: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    console.log(`Starting import of ${products.length} products`);

    for (const product of products) {
      try {
        // Check if product already exists
        const { data: existingProducts, error: checkError } = await supabase
          .from("products")
          .select("id")
          .eq("external_id", product.id.toString())
          .limit(1);

        if (checkError) {
          throw new Error(`Error checking for existing product: ${checkError.message}`);
        }

        const productExists = existingProducts && existingProducts.length > 0;

        if (productExists && !overwriteExisting) {
          console.log(`Skipping existing product: ${product.name}`);
          result.skipped++;
          continue;
        }

        // Prepare product data
        const productData = {
          name: product.name,
          description: product.description,
          short_description: product.short_description,
          sku: product.sku,
          price: parseFloat(product.price) || 0,
          regular_price: parseFloat(product.regular_price) || 0,
          sale_price: parseFloat(product.sale_price) || 0,
          external_id: product.id.toString(),
          external_url: product.permalink,
          status: product.status === "publish" ? "active" : "inactive",
          category: product.categories && product.categories.length > 0
            ? product.categories[0].name
            : null,
          stock_quantity: product.stock_quantity || 0,
          weight: product.weight || "",
          dimensions: product.dimensions
            ? `${product.dimensions.length}x${product.dimensions.width}x${product.dimensions.height}`
            : "",
          images: (product.images || []).map((img: any) => img.src).join(","),
          last_import: new Date().toISOString(),
        };

        // Insert or update product
        if (productExists) {
          // Update existing product
          const { error: updateError } = await supabase
            .from("products")
            .update(productData)
            .eq("external_id", product.id.toString());

          if (updateError) {
            throw new Error(`Error updating product: ${updateError.message}`);
          }

          console.log(`Updated product: ${product.name}`);
        } else {
          // Insert new product
          const { error: insertError } = await supabase
            .from("products")
            .insert(productData);

          if (insertError) {
            throw new Error(`Error inserting product: ${insertError.message}`);
          }

          console.log(`Inserted product: ${product.name}`);
        }

        // Handle variations if needed
        if (includeVariations && product.type === "variable") {
          await importProductVariations(
            product,
            overwriteExisting
          );
        }

        result.totalImported++;
      } catch (error) {
        console.error(`Error importing product ${product.name}:`, error);
        result.errors.push(
          `Error importing product ${product.name}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    return result;
  } catch (error) {
    console.error("Error in importWooCommerceProducts:", error);
    result.errors.push(
      `General import error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return result;
  }
}

/**
 * Import product variations
 */
async function importProductVariations(
  product: any,
  overwriteExisting: boolean
): Promise<void> {
  try {
    // Get variations from the WooCommerce API
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/woocommerce-import`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: "getVariations",
          productId: product.id,
          url: product.siteUrl,
          consumerKey: product.consumerKey,
          consumerSecret: product.consumerSecret,
        }),
      }
    );

    const result = await response.json();

    if (result.error) {
      throw new Error(`Error getting variations: ${result.error}`);
    }

    const variations = result.variations || [];
    console.log(`Processing ${variations.length} variations for product ${product.name}`);

    // Import each variation
    for (const variation of variations) {
      try {
        // Check if variation already exists
        const { data: existingVariations, error: checkError } = await supabase
          .from("product_variants")
          .select("id")
          .eq("external_id", variation.id.toString())
          .limit(1);

        if (checkError) {
          throw new Error(`Error checking for existing variation: ${checkError.message}`);
        }

        const variationExists = existingVariations && existingVariations.length > 0;

        if (variationExists && !overwriteExisting) {
          console.log(`Skipping existing variation: ${variation.id}`);
          continue;
        }

        // Prepare variation data
        const variationData = {
          product_external_id: product.id.toString(),
          external_id: variation.id.toString(),
          sku: variation.sku,
          price: parseFloat(variation.price) || 0,
          regular_price: parseFloat(variation.regular_price) || 0,
          sale_price: parseFloat(variation.sale_price) || 0,
          description: variation.description || "",
          attributes: JSON.stringify(variation.attributes || []),
          stock_quantity: variation.stock_quantity || 0,
          status: variation.status === "publish" ? "active" : "inactive",
          images: (variation.images || []).map((img: any) => img.src).join(","),
          last_import: new Date().toISOString(),
        };

        // Insert or update variation
        if (variationExists) {
          // Update existing variation
          const { error: updateError } = await supabase
            .from("product_variants")
            .update(variationData)
            .eq("external_id", variation.id.toString());

          if (updateError) {
            throw new Error(`Error updating variation: ${updateError.message}`);
          }

          console.log(`Updated variation: ${variation.id}`);
        } else {
          // Insert new variation
          const { error: insertError } = await supabase
            .from("product_variants")
            .insert(variationData);

          if (insertError) {
            throw new Error(`Error inserting variation: ${insertError.message}`);
          }

          console.log(`Inserted variation: ${variation.id}`);
        }
      } catch (error) {
        console.error(`Error importing variation ${variation.id}:`, error);
      }
    }
  } catch (error) {
    console.error("Error in importProductVariations:", error);
  }
}
