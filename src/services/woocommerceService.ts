import { Product } from "@/types/catalog";
import { supabase } from "@/integrations/supabase/client";
import { WooCommerceProduct, ImportResult } from "@/types/woocommerce";

export const mapDbProductToProduct = (dbProduct: any): Product => {
  return {
    id: dbProduct.id,
    name: dbProduct.name,
    brand: dbProduct.brand || '',
    category: dbProduct.category || '',
    description: dbProduct.description || '',
    price: parseFloat(dbProduct.price || '0'),
    createdAt: dbProduct.createdAt || new Date().toISOString(),
    updatedAt: dbProduct.updatedAt || new Date().toISOString(),
    active: dbProduct.active || true,
    shortDescription: dbProduct.short_description || '',
    sku: dbProduct.sku || '',
    regularPrice: dbProduct.regular_price || '0',
    salePrice: dbProduct.sale_price || '',
    dateOnSaleFrom: null,
    dateOnSaleTo: null,
    priceHtml: dbProduct.price_html || '',
    onSale: dbProduct.on_sale || false,
    purchasable: dbProduct.purchasable || true,
    totalSales: dbProduct.total_sales || 0,
    virtual: dbProduct.virtual || false,
    downloadable: dbProduct.downloadable || false,
    downloads: [],
    downloadLimit: dbProduct.download_limit || -1,
    downloadExpiry: dbProduct.download_expiry || -1,
    externalUrl: dbProduct.external_url || '',
    buttonText: dbProduct.button_text || '',
    taxStatus: dbProduct.tax_status || 'taxable',
    taxClass: dbProduct.tax_class || '',
    manageStock: dbProduct.manage_stock || false,
    stockQuantity: dbProduct.stock_quantity || 0,
    inStock: dbProduct.in_stock || true,
    backorders: dbProduct.backorders || 'no',
    backordersAllowed: dbProduct.backorders_allowed || false,
    backordered: dbProduct.backordered || false,
    soldIndividually: dbProduct.sold_individually || false,
    weight: dbProduct.weight || '',
    dimensions: {
      length: dbProduct.length || '',
      width: dbProduct.width || '',
      height: dbProduct.height || ''
    },
    shippingRequired: dbProduct.shipping_required || true,
    shippingTaxable: dbProduct.shipping_taxable || true,
    shippingClass: dbProduct.shipping_class || '',
    shippingClassId: dbProduct.shipping_class_id || 0,
    reviewsAllowed: dbProduct.reviews_allowed || true,
    averageRating: dbProduct.average_rating || '0',
    ratingCount: dbProduct.rating_count || 0,
    relatedIds: dbProduct.related_ids || [],
    upsellIds: dbProduct.upsell_ids || [],
    crossSellIds: dbProduct.cross_sell_ids || [],
    parentId: dbProduct.parent_id || 0,
    purchaseNote: dbProduct.purchase_note || '',
    categories: dbProduct.categories || [],
    tags: dbProduct.tags || [],
    images: dbProduct.images || [],
    attributes: dbProduct.attributes || [],
    defaultAttributes: dbProduct.default_attributes || [],
    variations: dbProduct.variations || [],
    groupedProducts: dbProduct.grouped_products || [],
    menuOrder: dbProduct.menu_order || 0,
    metaData: dbProduct.meta_data || [],
    image_alts: dbProduct.image_alts || [],
    // Add any custom fields needed
    price_number: parseFloat(dbProduct.price || '0'),
    stock: dbProduct.stock || 0,
    discount_per_quantity: dbProduct.discount_per_quantity || {},
    permalink: dbProduct.permalink || '',
    status: dbProduct.status || 'publish',
    featured: dbProduct.featured || false,
    catalogVisibility: dbProduct.catalog_visibility || 'visible',
    dateCreated: dbProduct.created_at || new Date().toISOString(),
    dateModified: dbProduct.updated_at || new Date().toISOString(),
    type: dbProduct.type || 'simple',
    monthly_price: dbProduct.monthly_price || 0,
    imageUrl: dbProduct.image_url || dbProduct.images?.[0]?.src || '',
    specifications: dbProduct.specifications || {},
    tier: dbProduct.tier || '',
    is_parent: dbProduct.is_parent || false,
    is_variation: dbProduct.is_variation || false,
    parent_id: dbProduct.parent_id || '',
    variants: dbProduct.variants || [],
    variation_attributes: dbProduct.variation_attributes || {},
    image_url: dbProduct.image_url || '',
    image_urls: dbProduct.image_urls || [],
    imageUrls: dbProduct.imageUrls || []
  };
};

export async function testWooCommerceConnection(
  siteUrl: string,
  consumerKey: string,
  consumerSecret: string
): Promise<boolean> {
  try {
    const response = await fetch(`${siteUrl}/wp-json/wc/v3/products?per_page=1`, {
      headers: {
        'Authorization': 'Basic ' + btoa(`${consumerKey}:${consumerSecret}`)
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error testing WooCommerce connection:', error);
    return false;
  }
}

export async function getWooCommerceProducts(
  siteUrl: string,
  consumerKey: string,
  consumerSecret: string,
  page: number = 1,
  perPage: number = 10
): Promise<WooCommerceProduct[]> {
  try {
    const response = await fetch(
      `${siteUrl}/wp-json/wc/v3/products?page=${page}&per_page=${perPage}&status=publish`, 
      {
        headers: {
          'Authorization': 'Basic ' + btoa(`${consumerKey}:${consumerSecret}`)
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching WooCommerce products:', error);
    return [];
  }
}

export async function fetchAllWooCommerceProducts(
  siteUrl: string,
  consumerKey: string,
  consumerSecret: string
): Promise<WooCommerceProduct[]> {
  try {
    let page = 1;
    const perPage = 100;
    let allProducts: WooCommerceProduct[] = [];
    let hasMoreProducts = true;
    
    while (hasMoreProducts) {
      const products = await getWooCommerceProducts(
        siteUrl,
        consumerKey,
        consumerSecret,
        page,
        perPage
      );
      
      if (products.length === 0) {
        hasMoreProducts = false;
      } else {
        allProducts = [...allProducts, ...products];
        page++;
      }
    }
    
    return allProducts;
  } catch (error) {
    console.error('Error fetching all WooCommerce products:', error);
    return [];
  }
}

export async function importWooCommerceProducts(
  products: (WooCommerceProduct & {
    siteUrl: string;
    consumerKey: string;
    consumerSecret: string;
  })[],
  includeVariations: boolean = true,
  overwriteExisting: boolean = false
): Promise<ImportResult> {
  try {
    const result: ImportResult = {
      success: true,
      totalImported: 0,
      skipped: 0,
      errors: []
    };
    
    for (const product of products) {
      try {
        const mappedProduct = {
          id: product.id.toString(),
          name: product.name,
          description: product.description,
          short_description: product.short_description,
          price: product.price || product.regular_price || '0',
          regular_price: product.regular_price || '0',
          sale_price: product.sale_price || '',
          sku: product.sku || '',
          categories: product.categories?.map(c => c.name).join(', ') || '',
          category: product.categories?.[0]?.name || '',
          brand: 'Imported',
          status: product.status,
          active: product.status === 'publish',
          created_at: product.date_created,
          updated_at: product.date_modified,
          stock: product.stock_quantity || 0,
          images: product.images?.map(img => img.src) || [],
          image_url: product.images?.[0]?.src || '',
          image_urls: product.images?.map(img => img.src) || [],
          imageUrls: product.images?.map(img => img.src) || [],
          image_alts: product.images?.map(img => img.alt || '') || [],
          is_parent: product.variations?.length > 0,
          parent_id: null,
          variations: [],
          is_variation: false
        };
        
        const { data: existingProduct } = await supabase
          .from('products')
          .select('*')
          .eq('sku', mappedProduct.sku)
          .maybeSingle();
        
        if (existingProduct && !overwriteExisting) {
          result.skipped++;
          continue;
        }
        
        if (existingProduct && overwriteExisting) {
          const { error } = await supabase
            .from('products')
            .update(mappedProduct)
            .eq('id', existingProduct.id);
          
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('products')
            .insert(mappedProduct);
          
          if (error) throw error;
        }
        
        result.totalImported++;
        
        if (includeVariations && product.variations && product.variations.length > 0) {
          for (const variationId of product.variations) {
            try {
              const variationResponse = await fetch(
                `${product.siteUrl}/wp-json/wc/v3/products/${product.id}/variations/${variationId}`,
                {
                  headers: {
                    'Authorization': 'Basic ' + btoa(`${product.consumerKey}:${product.consumerSecret}`)
                  }
                }
              );
              
              if (!variationResponse.ok) continue;
              
              const variation = await variationResponse.json();
              
              const mappedVariation = {
                id: `${product.id}-${variation.id}`,
                name: `${product.name} - ${variation.attributes.map((a: any) => a.option).join(', ')}`,
                description: product.description,
                short_description: product.short_description,
                price: variation.price || variation.regular_price || '0',
                regular_price: variation.regular_price || '0',
                sale_price: variation.sale_price || '',
                sku: variation.sku || '',
                category: product.categories?.[0]?.name || '',
                brand: 'Imported',
                status: 'publish',
                active: true,
                created_at: variation.date_created,
                updated_at: variation.date_modified,
                stock: variation.stock_quantity || 0,
                images: variation.image ? [variation.image.src] : (product.images?.map(img => img.src) || []),
                image_url: variation.image?.src || product.images?.[0]?.src || '',
                is_variation: true,
                parent_id: product.id.toString(),
                variation_attributes: variation.attributes.reduce((acc: any, attr: any) => {
                  acc[attr.name] = attr.option;
                  return acc;
                }, {})
              };
              
              const { data: existingVariation } = await supabase
                .from('products')
                .select('*')
                .eq('sku', mappedVariation.sku)
                .maybeSingle();
                
              if (existingVariation && !overwriteExisting) {
                continue;
              }
              
              if (existingVariation && overwriteExisting) {
                const { error } = await supabase
                  .from('products')
                  .update(mappedVariation)
                  .eq('id', existingVariation.id);
                
                if (error) throw error;
              } else {
                const { error } = await supabase
                  .from('products')
                  .insert(mappedVariation);
                
                if (error) throw error;
              }
            } catch (varError) {
              console.error(`Error importing variation ${variationId} for product ${product.id}:`, varError);
            }
          }
        }
      } catch (productError) {
        console.error(`Error importing product ${product.id}:`, productError);
        result.errors = result.errors || [];
        result.errors.push(`Error importing product ${product.name || product.id}: ${(productError as Error).message}`);
      }
    }
    
    if (result.errors && result.errors.length > 0) {
      result.success = false;
    }
    
    return result;
  } catch (error) {
    console.error('Error in importWooCommerceProducts:', error);
    return {
      success: false,
      totalImported: 0,
      skipped: 0,
      errors: [(error as Error).message]
    };
  }
}

export async function getWooCommerceConfig(userId: string) {
  try {
    const { data, error } = await supabase
      .from('woocommerce_configs')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting WooCommerce config:', error);
    return null;
  }
}

export async function saveWooCommerceConfig(userId: string, config: {
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
}) {
  try {
    localStorage.setItem('woocommerce_config', JSON.stringify(config));
    
    const { data, error } = await supabase
      .from('woocommerce_configs')
      .upsert({
        user_id: userId,
        site_url: config.siteUrl,
        consumer_key: config.consumerKey,
        consumer_secret: config.consumerSecret,
        updated_at: new Date().toISOString()
      });
      
    if (error) {
      console.error('Error saving WooCommerce config to db:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error saving WooCommerce config:', error);
    return false;
  }
}
