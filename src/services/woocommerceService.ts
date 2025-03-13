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

    // Vérifier si le bucket de stockage existe, sinon le créer
    await ensureStorageBucketExists();

    // Vérifier les produits existants
    const { data: existingProducts } = await supabase
      .from("products")
      .select("name, id");
    
    const existingNames = new Set<string>(existingProducts?.map(p => p.name.toLowerCase()) || []);
    const existingIds = new Map<string, string>(existingProducts?.map(p => [p.name.toLowerCase(), p.id]) || []);
    console.log(`Found ${existingNames.size} existing products`);

    // Regrouper les produits par leurs variations
    const productGroups = new Map<string, WooCommerceProduct[]>();
    const standaloneProducts: WooCommerceProduct[] = [];

    // D'abord, identifier les produits parents
    for (const product of products) {
      // Si le produit a des variations, il est un parent
      if (product.variations && product.variations.length > 0) {
        // Utiliser le nom du produit comme clé
        const key = product.name.toLowerCase();
        productGroups.set(key, [product]);
      } else {
        standaloneProducts.push(product);
      }
    }

    // Traiter les produits avec leurs variations
    for (const [parentName, productGroup] of productGroups) {
      const parentProduct = productGroup[0];
      console.log(`Processing product group: ${parentProduct.name} with variations`);

      try {
        // Importer le produit parent
        const parentProductData = await createProductFromWooCommerceData(
          parentProduct,
          existingNames,
          existingIds,
          overwriteExisting
        );

        if (parentProductData) {
          console.log(`Imported parent product: ${parentProductData.name}`);
          imported++;

          // Si on doit inclure les variations et que le produit en a
          if (includeVariations && parentProduct.variations && parentProduct.variations.length > 0) {
            console.log(`Fetching ${parentProduct.variations.length} variations for ${parentProduct.name}`);
            
            // Récupérer toutes les variations
            try {
              const variations = await getProductVariations(
                // Ces valeurs seraient normalement passées comme paramètres
                "https://www.itakecare.be",
                "ck_09a895603eb75cc364669e8e3317fe13e607ace0",
                "cs_52c6e6aa2332f0d7e1b395ab32c32f75a8ce4ccc",
                parentProduct.id
              );

              if (variations.length > 0) {
                console.log(`Processing ${variations.length} variations for product ${parentProduct.name}`);
                const variantIds: string[] = [];
                
                for (const variation of variations) {
                  try {
                    // Construire un nom pour la variation en fonction des attributs
                    let variationName = parentProduct.name;
                    const variationAttributes: Record<string, string> = {};
                    
                    if (variation.attributes && variation.attributes.length > 0) {
                      const attributeNames = variation.attributes
                        .map(attr => {
                          // Stocker chaque attribut pour référence ultérieure
                          if (attr.name && attr.option) {
                            variationAttributes[attr.name] = attr.option;
                            return `${attr.name}: ${attr.option}`;
                          }
                          return null;
                        })
                        .filter(Boolean)
                        .join(' - ');
                        
                      if (attributeNames) {
                        variationName += ` - ${attributeNames}`;
                      }
                    }
                    
                    if (!variation.name) {
                      variation.name = variationName;
                    }
                    
                    // Créer la variation comme un produit lié au parent
                    const variationProduct = {
                      ...await createProductFromWooCommerceData(
                        variation,
                        existingNames,
                        existingIds,
                        overwriteExisting,
                        true, // C'est une variation
                        parentProductData.id // ID du produit parent
                      ),
                      variation_attributes: variationAttributes
                    };
                    
                    if (variationProduct) {
                      variationsImported++;
                      variantIds.push(variationProduct.id);
                      console.log(`Imported variation: ${variationProduct.name}`);
                      
                      // Ajouter le nom à la liste des existants
                      existingNames.add(variation.name.toLowerCase());
                    } else {
                      variationsSkipped++;
                    }
                  } catch (variationError) {
                    console.error(`Error processing variation for ${parentProduct.name}:`, variationError);
                    errors.push(`Error with variation of ${parentProduct.name}: ${
                      variationError instanceof Error ? variationError.message : 'Unknown error'
                    }`);
                  }
                }
                
                // Mettre à jour le produit parent avec les références aux variations
                if (variantIds.length > 0) {
                  // Create an update object that matches the database schema
                  const updateData = {
                    is_parent: true,
                    variants_ids: variantIds
                  } as any; // Use type assertion to avoid type errors
                  
                  const { error: updateError } = await supabase
                    .from("products")
                    .update(updateData)
                    .eq("id", parentProductData.id);
                    
                  if (updateError) {
                    console.error(`Failed to update parent with variations: ${updateError.message}`);
                  }
                }
              }
            } catch (variationsError) {
              console.error(`Error fetching variations for ${parentProduct.name}:`, variationsError);
              errors.push(`Error fetching variations for ${parentProduct.name}: ${
                variationsError instanceof Error ? variationsError.message : 'Unknown error'
              }`);
            }
          }
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`Error processing product group ${parentProduct.name}:`, error);
        errors.push(`Failed to import ${parentProduct.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        skipped++;
      }
    }

    // Traiter les produits individuels
    for (const product of standaloneProducts) {
      try {
        const productData = await createProductFromWooCommerceData(
          product,
          existingNames,
          existingIds,
          overwriteExisting
        );
        
        if (productData) {
          imported++;
          console.log(`Imported standalone product: ${productData.name}`);
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`Error importing standalone product ${product.name}:`, error);
        errors.push(`Failed to import ${product.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        skipped++;
      }
    }

    console.log(`Import completed: ${imported} products and ${variationsImported} variations imported, ${skipped} products and ${variationsSkipped} variations skipped`);
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
  existingIds: Map<string, string>,
  overwriteExisting: boolean,
  isVariation: boolean = false,
  parentId?: string
): Promise<Product | null> {
  if (!wooProduct.name) {
    console.error(`Product ID ${wooProduct.id} has no name and was skipped`);
    return null;
  }

  // Vérifier si le produit existe déjà
  if (!overwriteExisting && existingNames.has(wooProduct.name.toLowerCase())) {
    console.log(`Product "${wooProduct.name}" already exists and was skipped`);
    return null;
  }

  // Extraire la marque et le nom (si possible)
  let brand = 'Generic';
  let name = wooProduct.name;
  
  // Essayer d'extraire la marque du début du nom
  const brandMatch = name.match(/^([\w\s]+)\s+(.+)$/);
  if (brandMatch) {
    brand = brandMatch[1].trim();
    name = brandMatch[2].trim();
  }

  // Gérer l'image
  let imageUrl = '';
  if (wooProduct.images && wooProduct.images.length > 0) {
    // Préférer l'image spécifique à la variation si disponible
    imageUrl = wooProduct.image?.src || wooProduct.images[0].src;
    
    // Tenter de télécharger l'image vers notre bucket de stockage
    try {
      const uploadedUrl = await downloadAndUploadImage(imageUrl, wooProduct.id.toString());
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      }
    } catch (imageError) {
      console.warn(`Could not upload image for ${wooProduct.name}, using original URL:`, imageError);
    }
  }

  // Calculer les prix
  const price = parseFloat(wooProduct.price || wooProduct.regular_price || "0");

  // Créer un objet de spécifications à partir des attributs
  const specifications = wooProduct.attributes?.reduce((acc, attr) => {
    if (attr.name) {
      acc[attr.name] = Array.isArray(attr.options) 
        ? attr.options.join(", ")
        : attr.option || '';
    }
    return acc;
  }, {} as Record<string, string>) || {};

  // Préparer les données du produit pour la base de données
  const productData = {
    name: wooProduct.name,
    description: wooProduct.short_description || wooProduct.description || '',
    price,
    brand,
    category: determineCategory(wooProduct.categories),
    image_url: imageUrl,  // Utilisez image_url au lieu de imageUrl
    specifications: specifications,
    active: wooProduct.status === "publish" || wooProduct.stock_status === "instock",
    is_variation: isVariation,
    sku: wooProduct.sku || '',
    parent_id: isVariation && parentId ? parentId : null,
  };

  // Si on écrase les existants, on tente d'abord de mettre à jour
  const existingId = existingIds.get(wooProduct.name.toLowerCase());
  
  if (overwriteExisting && existingId) {
    const { data, error } = await supabase
      .from("products")
      .update(productData)
      .eq("id", existingId)
      .select();

    if (error) {
      console.error(`Failed to update ${wooProduct.name}: ${error.message}`);
      return null;
    }
    
    return mapDbProductToProduct(data[0]);
  } else {
    // Insertion d'un nouveau produit
    const { data, error } = await supabase
      .from("products")
      .insert(productData)
      .select();

    if (error) {
      console.error(`Failed to import ${wooProduct.name}: ${error.message}`);
      return null;
    }
    
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

// Fonction pour s'assurer que le bucket existe
async function ensureStorageBucketExists() {
  try {
    // Vérifier si le bucket existe
    const { data: buckets } = await supabase.storage.listBuckets();
    
    if (!buckets || !buckets.find(b => b.name === 'product-images')) {
      console.log("Product images bucket doesn't exist, creating it");
      
      // Créer le bucket via l'API Supabase
      const { error } = await supabase.storage.createBucket('product-images', {
        public: true
      });
      
      if (error) {
        console.error("Error creating storage bucket:", error);
      } else {
        console.log("Created product-images bucket successfully");
      }
    }
  } catch (error) {
    console.error("Error checking/creating storage bucket:", error);
  }
}

// Fonction pour télécharger et upload une image
async function downloadAndUploadImage(imageUrl: string, productId: string): Promise<string | null> {
  try {
    console.log(`Downloading image from: ${imageUrl}`);
    
    // Télécharger l'image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    
    // Convertir en blob
    const imageBlob = await response.blob();
    
    // Déterminer le type de fichier
    const fileExtension = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
    const fileName = `product-${productId}-${Date.now()}.${fileExtension}`;
    
    // Upload vers Supabase Storage
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, imageBlob);
      
    if (error) {
      throw error;
    }
    
    // Obtenir l'URL publique
    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);
      
    console.log(`Uploaded image to: ${publicUrlData.publicUrl}`);
    
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("Error downloading and uploading image:", error);
    return null;
  }
}

// Helper function to convert database records to Product type
const mapDbProductToProduct = (record: any): Product => {
  return {
    id: record.id,
    name: record.name,
    brand: record.brand || "",
    category: record.category || "other",
    price: Number(record.price),
    description: record.description || "",
    imageUrl: record.image_url || "",  // Convertir image_url en imageUrl
    specifications: record.specifications || {},
    parent_id: record.parent_id || undefined,
    is_variation: record.is_variation || false,
    variation_attributes: record.variation_attributes || {},
    active: record.active !== false,
    createdAt: record.created_at ? new Date(record.created_at) : new Date(),  // Convertir created_at en createdAt
    updatedAt: record.updated_at ? new Date(record.updated_at) : new Date(),  // Convertir updated_at en updatedAt
    is_parent: record.is_parent || false,
    variants_ids: record.variants_ids || [],
    monthly_price: record.monthly_price,
    sku: record.sku || ""
  };
};
