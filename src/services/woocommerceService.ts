import { Product } from "@/types/catalog";
import { supabase } from "@/integrations/supabase/client";
import { WooCommerceProduct, ImportResult } from "@/types/woocommerce";
import { ensureStorageBucket, downloadAndStoreImage } from "@/services/storageService";
import { v4 as uuidv4 } from 'uuid';

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
    imageUrls: dbProduct.image_urls || []
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

async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('check-column-exists', {
      body: { table_name: tableName, column_name: columnName }
    });
    
    if (error) {
      console.error('Error checking if column exists:', error);
      return false;
    }
    
    return data?.exists || false;
  } catch (error) {
    console.error('Error in checkColumnExists:', error);
    return false;
  }
}

function generateUuidFromId(numericId: number | string): string {
  const idStr = String(numericId);
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idStr)) {
    return idStr;
  }
  
  const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  return `woo-${idStr}-${uuidv4().substring(8)}`;
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
    
    const columnsToCheck = [
      'image_urls', 'image_url', 'category', 'specifications', 
      'regular_price', 'sale_price', 'short_description', 'status',
      'is_parent', 'parent_id', 'is_variation', 'variation_attributes'
    ];
    const columnStatus: Record<string, boolean> = {};
    
    for (const column of columnsToCheck) {
      columnStatus[column] = await checkColumnExists('products', column);
      console.log(`Column '${column}' exists: ${columnStatus[column]}`);
    }
    
    for (const product of products) {
      try {
        const categoryString = product.categories?.map(c => c.name).join(', ') || '';
        const mainImageUrl = product.images?.[0]?.src || '';
        const imageUrls = product.images?.map(img => img.src) || [];
        const specifications = {
          categories: product.categories?.map(c => c.name) || []
        };
        
        const generatedUuid = generateUuidFromId(product.id);
        
        const mappedProduct: Record<string, any> = {
          id: generatedUuid,
          name: product.name,
          description: product.description,
          price: product.price || '0',
          brand: 'Imported',
          active: product.status === 'publish',
          created_at: product.date_created,
          updated_at: product.date_modified,
          stock: product.stock_quantity || 0
        };
        
        if (columnStatus['category']) {
          mappedProduct.category = product.categories?.[0]?.name || '';
        }
        
        if (columnStatus['specifications']) {
          mappedProduct.specifications = JSON.stringify(specifications);
        }
        
        if (columnStatus['image_url']) {
          mappedProduct.image_url = mainImageUrl;
        }
        
        if (columnStatus['image_urls']) {
          mappedProduct.image_urls = imageUrls;
        }
        
        if (columnStatus['short_description']) {
          mappedProduct.short_description = product.short_description || '';
        }
        
        if (columnStatus['status']) {
          mappedProduct.status = product.status || 'publish';
        }
        
        if (columnStatus['is_parent']) {
          mappedProduct.is_parent = product.variations?.length > 0;
        }
        
        if (columnStatus['parent_id']) {
          mappedProduct.parent_id = null;
        }
        
        if (columnStatus['is_variation']) {
          mappedProduct.is_variation = false;
        }
        
        const { data: existingProduct } = await supabase
          .from('products')
          .select('*')
          .eq('id', generatedUuid)
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
          
          if (error) {
            console.error(`Error updating product ${product.id}:`, error);
            result.errors = result.errors || [];
            result.errors.push(`Error updating product ${product.name || product.id}: ${error.message}`);
            continue;
          }
        } else {
          const { error } = await supabase
            .from('products')
            .insert(mappedProduct);
          
          if (error) {
            console.error(`Error inserting product ${product.id}:`, error);
            result.errors = result.errors || [];
            result.errors.push(`Error inserting product ${product.name || product.id}: ${error.message}`);
            continue;
          }
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
              
              const variationUuid = generateUuidFromId(`${product.id}-${variation.id}`);
              
              const mappedVariation: Record<string, any> = {
                id: variationUuid,
                name: `${product.name} - ${variation.attributes.map((a: any) => a.option).join(', ')}`,
                description: product.description,
                price: variation.price || '0',
                brand: 'Imported',
                active: true,
                created_at: variation.date_created,
                updated_at: variation.date_modified,
                stock: variation.stock_quantity || 0
              };
              
              if (columnStatus['image_url']) {
                mappedVariation.image_url = variation.image?.src || mainImageUrl;
              }
              
              if (columnStatus['image_urls']) {
                mappedVariation.image_urls = variation.image ? [variation.image.src] : imageUrls;
              }
              
              if (columnStatus['category']) {
                mappedVariation.category = product.categories?.[0]?.name || '';
              }
              
              if (columnStatus['is_variation']) {
                mappedVariation.is_variation = true;
              }
              
              if (columnStatus['parent_id']) {
                mappedVariation.parent_id = generatedUuid;
              }
              
              if (columnStatus['variation_attributes']) {
                mappedVariation.variation_attributes = variation.attributes.reduce((acc: any, attr: any) => {
                  acc[attr.name] = attr.option;
                  return acc;
                }, {});
              }
              
              const { data: existingVariation } = await supabase
                .from('products')
                .select('*')
                .eq('id', variationUuid)
                .maybeSingle();
              
              if (existingVariation && !overwriteExisting) {
                continue;
              }
              
              if (existingVariation && overwriteExisting) {
                const { error } = await supabase
                  .from('products')
                  .update(mappedVariation)
                  .eq('id', existingVariation.id);
                
                if (error) {
                  console.error(`Error updating variation ${variationId}:`, error);
                  continue;
                }
              } else {
                const { error } = await supabase
                  .from('products')
                  .insert(mappedVariation);
                
                if (error) {
                  console.error(`Error inserting variation ${variationId}:`, error);
                  continue;
                }
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

export const convertWooCommerceProductToProduct = (wooProduct: any): Product => {
  return {
    id: wooProduct.id.toString(),
    name: wooProduct.name,
    description: wooProduct.description,
    price: parseFloat(wooProduct.price || '0'),
    image_url: wooProduct.images && wooProduct.images.length > 0 ? wooProduct.images[0].src : undefined,
    brand: wooProduct.attributes?.find((attr: any) => attr.name === 'Brand')?.options?.[0] || undefined,
    category: wooProduct.categories && wooProduct.categories.length > 0 ? wooProduct.categories[0].name : undefined,
    stock: wooProduct.stock_quantity,
    active: wooProduct.status === 'publish',
    created_at: wooProduct.date_created,
    updated_at: wooProduct.date_modified,
    specifications: convertAttributesToSpecifications(wooProduct.attributes || []),
  };
};
