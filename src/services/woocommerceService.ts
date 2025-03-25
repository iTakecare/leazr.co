import { Product } from "@/types/catalog";
import { supabase } from "@/integrations/supabase/client";
import { WooCommerceProduct, WooCommerceProductWithCredentials, ImportResult } from "@/types/woocommerce";
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
  
  return uuidv4();
}

function extractVariantAttributesFromName(name: string): Record<string, string> {
  // Par défaut, on commence sans attributs
  const attributes: Record<string, string> = {};
  
  // Cherche un format comme "Nom de base - Attribut1, Attribut2"
  const match = name.match(/^(.+?) - (.+)$/);
  if (match) {
    const attributesText = match[2];
    
    // Découpe les attributs séparés par des virgules
    const attributeParts = attributesText.split(',').map(p => p.trim());
    
    // Essaie d'identifier les attributs connus
    attributeParts.forEach(part => {
      if (part.includes("Go") || part.includes("GB") || part.includes("TB") || part.includes("To")) {
        // Stockage
        attributes["Stockage"] = part;
      } else if (part.match(/(\d+)Go\s*RAM/) || part.match(/(\d+)GB\s*RAM/) || 
                 part.includes("18Go") || part.includes("36Go") || 
                 part.match(/^(\d+)Go$/) || part.match(/^(\d+)GB$/)) {
        // Mémoire RAM
        attributes["RAM"] = part;
      } else if (part.includes("pouces") || part.includes("inch")) {
        // Taille d'écran
        attributes["Écran"] = part;
      } else if (part.includes("i5") || part.includes("i7") || part.includes("i9") || 
                 part.includes("M1") || part.includes("M2") || part.includes("M3")) {
        // Processeur
        attributes["Processeur"] = part;
      } else if (part.includes("Pro") || part.includes("Max") || part.includes("Ultra")) {
        // Variante de processeur
        attributes["Modèle"] = part;
      } else {
        // Attribut générique
        attributes[`Attribut_${Object.keys(attributes).length + 1}`] = part;
      }
    });
  }
  
  return attributes;
}

function getBaseProductName(name: string): string {
  // Retirer la partie après le premier tiret
  const match = name.match(/^(.+?) - (.+)$/);
  if (match) {
    return match[1].trim();
  }
  return name;
}

export async function importWooCommerceProducts(
  products: WooCommerceProductWithCredentials[],
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
      'is_parent', 'parent_id', 'is_variation', 'variation_attributes',
      'monthly_price'
    ];
    const columnStatus: Record<string, boolean> = {};
    
    for (const column of columnsToCheck) {
      columnStatus[column] = await checkColumnExists('products', column);
      console.log(`Column '${column}' exists: ${columnStatus[column]}`);
    }
    
    // Regrouper les produits par leur nom de base (pour détecter les variants)
    const productGroups: Record<string, WooCommerceProductWithCredentials[]> = {};
    
    // Première passe : identifier les produits parents et grouper les variants potentiels
    for (const product of products) {
      const baseName = getBaseProductName(product.name);
      if (!productGroups[baseName]) {
        productGroups[baseName] = [];
      }
      productGroups[baseName].push(product);
    }
    
    // Maintenant, traiter chaque groupe de produits
    for (const [baseName, groupProducts] of Object.entries(productGroups)) {
      try {
        // Si nous avons plus d'un produit dans le groupe, nous avons potentiellement un parent avec des variantes
        const isParentWithVariants = groupProducts.length > 1;
        
        // Trouver le produit parent (soit celui sans attributs dans le nom, soit le premier)
        const potentialParent = groupProducts.find(p => p.name === baseName) || groupProducts[0];
        const parentUuid = uuidv4();
        
        // Identifiants des variants pour les lier au parent
        const variantIds: string[] = [];
        const variationAttributes: Record<string, string[]> = {};
        
        // Préparer le produit parent
        const categoryString = potentialParent.categories?.map(c => c.name).join(', ') || '';
        const mainImageUrl = potentialParent.images?.[0]?.src || '';
        const imageUrls = potentialParent.images?.map(img => img.src) || [];
        const specifications = {
          categories: potentialParent.categories?.map(c => c.name) || []
        };
        
        // Extraire les attributs de variation si c'est un produit avec variations
        if (isParentWithVariants) {
          // Collecter tous les attributs et valeurs possibles de tous les variants
          groupProducts.forEach(product => {
            if (product.name !== baseName) {
              const productAttributes = extractVariantAttributesFromName(product.name);
              
              // Ajouter chaque attribut et valeur trouvés
              Object.entries(productAttributes).forEach(([attrName, attrValue]) => {
                if (!variationAttributes[attrName]) {
                  variationAttributes[attrName] = [];
                }
                if (!variationAttributes[attrName].includes(attrValue)) {
                  variationAttributes[attrName].push(attrValue);
                }
              });
            }
          });
        }
        
        // Mapper le produit parent
        const mappedParent: Record<string, any> = {
          id: parentUuid,
          name: baseName,
          description: potentialParent.description,
          price: potentialParent.price || '0',
          brand: 'Apple', // À adapter selon le produit
          active: potentialParent.status === 'publish',
          created_at: potentialParent.date_created,
          updated_at: potentialParent.date_modified,
          stock: potentialParent.stock_quantity || 0,
          sku: `woo-${potentialParent.id}`
        };
        
        // Définir les attributs spécifiques au produit parent
        if (columnStatus['category']) {
          mappedParent.category = potentialParent.categories?.[0]?.name || '';
        }
        
        if (columnStatus['specifications']) {
          mappedParent.specifications = JSON.stringify(specifications);
        }
        
        if (columnStatus['image_url']) {
          mappedParent.image_url = mainImageUrl;
        }
        
        if (columnStatus['image_urls']) {
          mappedParent.image_urls = imageUrls;
        }
        
        if (columnStatus['short_description']) {
          mappedParent.short_description = potentialParent.short_description || '';
        }
        
        if (columnStatus['status']) {
          mappedParent.status = potentialParent.status || 'publish';
        }
        
        if (columnStatus['is_parent']) {
          mappedParent.is_parent = isParentWithVariants;
        }
        
        if (columnStatus['parent_id']) {
          mappedParent.parent_id = null;
        }
        
        if (columnStatus['is_variation']) {
          mappedParent.is_variation = false;
        }
        
        if (columnStatus['variation_attributes'] && isParentWithVariants) {
          mappedParent.variation_attributes = variationAttributes;
        }
        
        // Vérifier si le produit existe déjà
        const { data: existingProductBySku } = await supabase
          .from('products')
          .select('*')
          .eq('sku', `woo-${potentialParent.id}`)
          .maybeSingle();
        
        if (existingProductBySku && !overwriteExisting) {
          result.skipped++;
          continue;
        }
        
        if (existingProductBySku && overwriteExisting) {
          const { error } = await supabase
            .from('products')
            .update(mappedParent)
            .eq('id', existingProductBySku.id);
          
          if (error) {
            console.error(`Error updating product ${potentialParent.id}:`, error);
            result.errors = result.errors || [];
            result.errors.push(`Error updating product ${potentialParent.name || potentialParent.id}: ${error.message}`);
            continue;
          }
        } else {
          const { error } = await supabase
            .from('products')
            .insert(mappedParent);
          
          if (error) {
            console.error(`Error inserting product ${potentialParent.id}:`, error);
            result.errors = result.errors || [];
            result.errors.push(`Error inserting product ${potentialParent.name || potentialParent.id}: ${error.message}`);
            continue;
          }
        }
        
        result.totalImported++;
        
        // Maintenant traiter tous les variants qui ne sont pas le parent
        if (isParentWithVariants) {
          for (const variantProduct of groupProducts) {
            // Sauter le produit parent que nous avons déjà traité
            if (variantProduct.name === baseName && variantProduct.id === potentialParent.id) {
              continue;
            }
            
            try {
              const variantUuid = uuidv4();
              variantIds.push(variantUuid);
              
              // Extraire les attributs du nom
              const variantAttributes = extractVariantAttributesFromName(variantProduct.name);
              
              // Si le prix est numérique, utilisons-le comme prix mensuel
              let monthlyPrice = 0;
              if (!isNaN(parseFloat(variantProduct.price || '0'))) {
                monthlyPrice = parseFloat(variantProduct.price || '0');
              }
              
              const mappedVariation: Record<string, any> = {
                id: variantUuid,
                name: variantProduct.name,
                description: potentialParent.description,
                price: variantProduct.price || '0',
                brand: mappedParent.brand,
                active: true,
                created_at: variantProduct.date_created,
                updated_at: variantProduct.date_modified,
                stock: variantProduct.stock_quantity || 0,
                sku: `woo-${variantProduct.id}`
              };
              
              if (columnStatus['monthly_price']) {
                mappedVariation.monthly_price = monthlyPrice;
              }
              
              if (columnStatus['image_url']) {
                mappedVariation.image_url = variantProduct.images?.[0]?.src || mainImageUrl;
              }
              
              if (columnStatus['image_urls']) {
                mappedVariation.image_urls = variantProduct.images?.map(img => img.src) || imageUrls;
              }
              
              if (columnStatus['category']) {
                mappedVariation.category = potentialParent.categories?.[0]?.name || '';
              }
              
              if (columnStatus['is_variation']) {
                mappedVariation.is_variation = true;
              }
              
              if (columnStatus['parent_id']) {
                mappedVariation.parent_id = parentUuid;
              }
              
              if (columnStatus['variation_attributes']) {
                mappedVariation.variation_attributes = variantAttributes;
              }
              
              const { data: existingVariation } = await supabase
                .from('products')
                .select('*')
                .eq('sku', `woo-${variantProduct.id}`)
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
                  console.error(`Error updating variation ${variantProduct.id}:`, error);
                  continue;
                }
              } else {
                const { error } = await supabase
                  .from('products')
                  .insert(mappedVariation);
                
                if (error) {
                  console.error(`Error inserting variation ${variantProduct.id}:`, error);
                  continue;
                }
              }
              
              result.totalImported++;
            } catch (varError) {
              console.error(`Error importing variant ${variantProduct.id}:`, varError);
            }
          }
          
          // Mettre à jour le produit parent avec les IDs des variants
          if (variantIds.length > 0) {
            const { error } = await supabase
              .from('products')
              .update({ variants_ids: variantIds })
              .eq('id', parentUuid);
            
            if (error) {
              console.error(`Error updating parent product with variant IDs:`, error);
            }
          }
        }
        
        // Gérer également les variations d'origine WooCommerce si présentes
        if (includeVariations && potentialParent.variations && potentialParent.variations.length > 0) {
          for (const variationId of potentialParent.variations) {
            try {
              const variationResponse = await fetch(
                `${potentialParent.siteUrl}/wp-json/wc/v3/products/${potentialParent.id}/variations/${variationId}`,
                {
                  headers: {
                    'Authorization': 'Basic ' + btoa(`${potentialParent.consumerKey}:${potentialParent.consumerSecret}`)
                  }
                }
              );
              
              if (!variationResponse.ok) continue;
              
              const variation = await variationResponse.json();
              
              const variationUuid = uuidv4();
              variantIds.push(variationUuid);
              
              // Si le prix est numérique, utilisons-le comme prix mensuel
              let monthlyPrice = 0;
              if (!isNaN(parseFloat(variation.price || '0'))) {
                monthlyPrice = parseFloat(variation.price || '0');
              }
              
              const mappedVariation: Record<string, any> = {
                id: variationUuid,
                name: `${baseName} - ${variation.attributes.map((a: any) => a.option).join(', ')}`,
                description: potentialParent.description,
                price: variation.price || '0',
                brand: mappedParent.brand,
                active: true,
                created_at: variation.date_created,
                updated_at: variation.date_modified,
                stock: variation.stock_quantity || 0,
                sku: `woo-${potentialParent.id}-var-${variation.id}`
              };
              
              if (columnStatus['monthly_price']) {
                mappedVariation.monthly_price = monthlyPrice;
              }
              
              if (columnStatus['image_url']) {
                mappedVariation.image_url = variation.image?.src || mainImageUrl;
              }
              
              if (columnStatus['image_urls']) {
                mappedVariation.image_urls = variation.image ? [variation.image.src] : imageUrls;
              }
              
              if (columnStatus['category']) {
                mappedVariation.category = potentialParent.categories?.[0]?.name || '';
              }
              
              if (columnStatus['is_variation']) {
                mappedVariation.is_variation = true;
              }
              
              if (columnStatus['parent_id']) {
                mappedVariation.parent_id = parentUuid;
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
                .eq('sku', `woo-${potentialParent.id}-var-${variation.id}`)
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
              
              result.totalImported++;
            } catch (varError) {
              console.error(`Error importing variation ${variationId} for product ${potentialParent.id}:`, varError);
            }
          }
          
          // Mettre à jour le produit parent avec les IDs des variants
          if (variantIds.length > 0) {
            const { error } = await supabase
              .from('products')
              .update({ variants_ids: variantIds })
              .eq('id', parentUuid);
            
            if (error) {
              console.error(`Error updating parent product with variant IDs:`, error);
            }
          }
        }
      } catch (productError) {
        console.error(`Error importing product group ${baseName}:`, productError);
        result.errors = result.errors || [];
        result.errors.push(`Error importing product group ${baseName}: ${(productError as Error).message}`);
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
