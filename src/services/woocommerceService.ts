
import { Product } from '@/types/catalog';
import { WooCommerceProduct, ImportResult } from '@/types/woocommerce';
import { supabase } from '@/integrations/supabase/client';

// Convert product specifications to attributes for WooCommerce
const convertSpecificationsToAttributes = (specifications: Record<string, string> | undefined): any[] => {
  if (!specifications) return [];
  
  return Object.entries(specifications).map(([name, value]) => ({
    name,
    visible: true,
    options: [value]
  }));
};

// Convert product to WooCommerce format
export const convertProductToWooCommerce = (product: Product): any => {
  return {
    name: product.name,
    type: "simple",
    regular_price: product.price.toString(),
    description: product.description || "",
    short_description: product.description?.substring(0, 150) || "",
    categories: product.category ? [{ name: product.category }] : [],
    images: product.imageUrl ? [{ src: product.imageUrl }] : [],
    attributes: convertSpecificationsToAttributes(product.specifications),
    sku: product.sku || ""
  };
};

// Convert WooCommerce product to our format
export const convertWooCommerceToProduct = (wcProduct: any): Product => {
  // Function to convert WooCommerce attributes to specifications
  const convertAttributesToSpecifications = (attributes: any[]): Record<string, string> => {
    if (!attributes || !Array.isArray(attributes)) return {};
    
    const specs: Record<string, string> = {};
    attributes.forEach(attr => {
      if (attr.options && attr.options.length > 0) {
        specs[attr.name] = attr.options[0];
      }
    });
    return specs;
  };
  
  return {
    id: wcProduct.id.toString(),
    name: wcProduct.name,
    description: wcProduct.description,
    price: parseFloat(wcProduct.price || wcProduct.regular_price || "0"),
    image_url: wcProduct.images && wcProduct.images.length > 0 ? wcProduct.images[0].src : undefined,
    category: wcProduct.categories && wcProduct.categories.length > 0 ? wcProduct.categories[0].name : undefined,
    brand: undefined, // WooCommerce doesn't have a built-in brand attribute
    specifications: convertAttributesToSpecifications(wcProduct.attributes),
    active: wcProduct.status === "publish",
    sku: wcProduct.sku
  };
};

// Test WooCommerce connection
export const testWooCommerceConnection = async (
  siteUrl: string,
  consumerKey: string,
  consumerSecret: string
): Promise<boolean> => {
  try {
    const { data } = await supabase.functions.invoke('woocommerce-import', {
      body: {
        action: 'testConnection',
        url: siteUrl,
        consumerKey,
        consumerSecret
      }
    });
    
    return data?.success || false;
  } catch (error) {
    console.error("Error testing WooCommerce connection:", error);
    return false;
  }
};

// Get WooCommerce products with pagination
export const getWooCommerceProducts = async (
  siteUrl: string,
  consumerKey: string,
  consumerSecret: string,
  page: number = 1,
  perPage: number = 10
): Promise<WooCommerceProduct[]> => {
  try {
    const { data } = await supabase.functions.invoke('woocommerce-import', {
      body: {
        action: 'getProducts',
        url: siteUrl,
        consumerKey,
        consumerSecret,
        page,
        perPage
      }
    });
    
    return data?.products || [];
  } catch (error) {
    console.error("Error fetching WooCommerce products:", error);
    return [];
  }
};

// Fetch all WooCommerce products (multiple pages)
export const fetchAllWooCommerceProducts = async (
  siteUrl: string,
  consumerKey: string,
  consumerSecret: string
): Promise<WooCommerceProduct[]> => {
  try {
    let allProducts: WooCommerceProduct[] = [];
    let page = 1;
    let hasMoreProducts = true;
    const perPage = 100;
    
    while (hasMoreProducts) {
      const products = await getWooCommerceProducts(siteUrl, consumerKey, consumerSecret, page, perPage);
      
      if (products.length > 0) {
        allProducts = [...allProducts, ...products];
        page++;
      } else {
        hasMoreProducts = false;
      }
      
      // Safety check to prevent infinite loops
      if (page > 10) hasMoreProducts = false;
    }
    
    return allProducts;
  } catch (error) {
    console.error("Error fetching all WooCommerce products:", error);
    return [];
  }
};

// Import WooCommerce products into the database
export const importWooCommerceProducts = async (
  products: WooCommerceProduct[],
  includeVariations: boolean = true,
  overwriteExisting: boolean = false
): Promise<ImportResult> => {
  try {
    let totalImported = 0;
    let skipped = 0;
    const errors: string[] = [];
    
    for (const product of products) {
      try {
        // Convert WooCommerce product to our format
        const convertedProduct = convertWooCommerceToProduct(product);
        
        // Check if the product already exists
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('id', convertedProduct.id)
          .single();
        
        if (existingProduct && !overwriteExisting) {
          skipped++;
          continue;
        }
        
        if (existingProduct && overwriteExisting) {
          // Update existing product
          const { error } = await supabase
            .from('products')
            .update(convertedProduct)
            .eq('id', convertedProduct.id);
          
          if (error) throw error;
        } else {
          // Insert new product
          const { error } = await supabase
            .from('products')
            .insert([convertedProduct]);
          
          if (error) throw error;
        }
        
        totalImported++;
        
        // Import variations if needed
        if (includeVariations && product.variations && product.variations.length > 0) {
          // Fetch product variations
          const { data } = await supabase.functions.invoke('woocommerce-import', {
            body: {
              action: 'getVariations',
              url: product.siteUrl,
              consumerKey: product.consumerKey,
              consumerSecret: product.consumerSecret,
              productId: product.id
            }
          });
          
          if (data?.variations) {
            for (const variation of data.variations) {
              const convertedVariation = convertWooCommerceToProduct(variation);
              convertedVariation.parent_id = product.id.toString();
              convertedVariation.is_variation = true;
              
              // Check if variation exists
              const { data: existingVariation } = await supabase
                .from('products')
                .select('id')
                .eq('id', convertedVariation.id)
                .single();
              
              if (existingVariation && !overwriteExisting) {
                skipped++;
                continue;
              }
              
              if (existingVariation && overwriteExisting) {
                // Update existing variation
                const { error } = await supabase
                  .from('products')
                  .update(convertedVariation)
                  .eq('id', convertedVariation.id);
                
                if (error) throw error;
              } else {
                // Insert new variation
                const { error } = await supabase
                  .from('products')
                  .insert([convertedVariation]);
                
                if (error) throw error;
              }
              
              totalImported++;
            }
          }
        }
      } catch (error) {
        console.error(`Error importing product ${product.name}:`, error);
        errors.push(`Failed to import ${product.name}: ${error.message || 'Unknown error'}`);
      }
    }
    
    return {
      success: errors.length === 0,
      totalImported,
      skipped,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error("Error importing WooCommerce products:", error);
    return {
      success: false,
      totalImported: 0,
      skipped: 0,
      errors: [error.message || 'Unknown error']
    };
  }
};

// Save WooCommerce configuration
export const saveWooCommerceConfig = async (
  userId: string, 
  config: {
    siteUrl: string;
    consumerKey: string;
    consumerSecret: string;
  }
): Promise<boolean> => {
  try {
    // Store the config in localStorage for now
    localStorage.setItem('woocommerce_config', JSON.stringify(config));
    
    // Also try to store in the database if available
    try {
      const { error } = await supabase
        .from('woocommerce_configs')
        .upsert({
          user_id: userId,
          site_url: config.siteUrl,
          consumer_key: config.consumerKey,
          consumer_secret: config.consumerSecret
        });
      
      if (error) throw error;
    } catch (dbError) {
      console.warn("Error saving to database, using localStorage only:", dbError);
    }
    
    return true;
  } catch (error) {
    console.error("Error saving WooCommerce config:", error);
    return false;
  }
};

// Get WooCommerce configuration
export const getWooCommerceConfig = async (userId: string): Promise<{
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
} | null> => {
  try {
    // Try to get from database first
    try {
      const { data, error } = await supabase
        .from('woocommerce_configs')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        return {
          siteUrl: data.site_url,
          consumerKey: data.consumer_key,
          consumerSecret: data.consumer_secret
        };
      }
    } catch (dbError) {
      console.warn("Error fetching from database, trying localStorage:", dbError);
    }
    
    // Fallback to localStorage
    const config = localStorage.getItem('woocommerce_config');
    if (config) {
      return JSON.parse(config);
    }
    
    return null;
  } catch (error) {
    console.error("Error getting WooCommerce config:", error);
    return null;
  }
};
