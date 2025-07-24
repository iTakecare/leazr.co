import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  type: string; // simple, variable, variation, etc.
  parent_id?: number;
  description: string;
  short_description: string;
  price: string;
  regular_price: string;
  sale_price: string;
  images: Array<{ src: string; alt: string }>;
  categories: Array<{ id: number; name: string }>;
  attributes: Array<{ id: number; name: string; options: string[]; variation?: boolean }>;
  variations?: number[];
  meta_data: Array<{ key: string; value: any }>;
}

interface WooCommerceVariation {
  id: number;
  price: string;
  regular_price: string;
  sale_price: string;
  attributes: Array<{ id: number; name: string; option: string }>;
  image?: { src: string; alt: string };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('WooCommerce Import: Début de la requête', { method: req.method });
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { action, companyId, configId, productIds } = await req.json();
    console.log('WooCommerce Import: Paramètres reçus', { 
      action, 
      companyId, 
      configId, 
      productIdsCount: productIds?.length 
    });

    // Récupérer la configuration WooCommerce avec logs détaillés
    console.log('WooCommerce Import: Récupération de la configuration', configId);
    const { data: config, error: configError } = await supabaseClient
      .from('woocommerce_configs')
      .select('*')
      .eq('id', configId)
      .single();

    if (configError) {
      console.error('WooCommerce Import: Erreur lors de la récupération de la config:', configError);
      throw new Error(`Configuration WooCommerce non trouvée: ${configError.message}`);
    }

    if (!config) {
      console.error('WooCommerce Import: Configuration vide');
      throw new Error('Configuration WooCommerce non trouvée');
    }

    console.log('WooCommerce Import: Configuration récupérée avec succès', {
      site_url: config.site_url,
      hasConsumerKey: !!config.consumer_key,
      hasConsumerSecret: !!config.consumer_secret
    });

    if (action === 'test-connection') {
      console.log('WooCommerce Import: Test de connexion');
      return await testWooCommerceConnection(config);
    }

    if (action === 'fetch-products') {
      console.log('WooCommerce Import: Récupération des produits');
      return await fetchWooCommerceProducts(config);
    }

    if (action === 'import-products') {
      console.log('WooCommerce Import: Import des produits', { count: productIds?.length });
      if (!productIds || !Array.isArray(productIds)) {
        throw new Error('IDs de produits manquants ou invalides');
      }
      if (!companyId) {
        throw new Error('Company ID manquant');
      }
      return await importProducts(config, productIds, supabaseClient, companyId);
    }

    console.error('WooCommerce Import: Action non reconnue:', action);
    throw new Error(`Action non reconnue: ${action}`);

  } catch (error) {
    console.error('WooCommerce Import: Erreur générale:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        details: error.stack || 'Pas de détails disponibles'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function testWooCommerceConnection(config: any) {
  try {
    const auth = btoa(`${config.consumer_key}:${config.consumer_secret}`);
    
    const response = await fetch(`${config.site_url}/wp-json/wc/v3/products?per_page=1`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur de connexion: ${response.status} ${response.statusText}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Connexion réussie' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function fetchWooCommerceProducts(config: any) {
  try {
    const auth = btoa(`${config.consumer_key}:${config.consumer_secret}`);
    let allProducts: WooCommerceProduct[] = [];
    let page = 1;
    const perPage = 50;

    while (true) {
      const response = await fetch(
        `${config.site_url}/wp-json/wc/v3/products?per_page=${perPage}&page=${page}`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des produits: ${response.status}`);
      }

      const products = await response.json();
      if (products.length === 0) break;

      allProducts = allProducts.concat(products);
      page++;

      // Limiter à 500 produits pour éviter les timeouts
      if (allProducts.length >= 500) break;
    }

    console.log(`Récupération de ${allProducts.length} produits depuis WooCommerce`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        products: allProducts.map(formatProduct),
        total: allProducts.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function importProducts(config: any, productIds: number[], supabaseClient: any, companyId: string) {
  try {
    console.log(`WooCommerce Import: Début import de ${productIds.length} produits pour company ${companyId}`);
    
    const auth = btoa(`${config.consumer_key}:${config.consumer_secret}`);
    const importedProducts = [];
    const errors = [];

    // Fonction helper pour créer ou récupérer une marque
    const getOrCreateBrand = async (brandName: string) => {
      if (!brandName || brandName.trim() === '') {
        brandName = 'Non spécifié';
      }

      // Chercher la marque existante
      const { data: existingBrand, error: searchError } = await supabaseClient
        .from('brands')
        .select('id')
        .eq('name', brandName)
        .eq('company_id', companyId)
        .limit(1);

      if (searchError) {
        console.error('WooCommerce Import: Erreur recherche marque:', searchError);
        return null;
      }

      if (existingBrand && existingBrand.length > 0) {
        console.log(`WooCommerce Import: Marque existante trouvée: ${brandName} (ID: ${existingBrand[0].id})`);
        return existingBrand[0].id;
      }

      // Créer la marque si elle n'existe pas
      const { data: newBrand, error: createError } = await supabaseClient
        .from('brands')
        .insert({
          name: brandName,
          translation: brandName,
          company_id: companyId
        })
        .select('id');

      if (createError) {
        console.error('WooCommerce Import: Erreur création marque:', createError);
        return null;
      }

      console.log(`WooCommerce Import: Nouvelle marque créée: ${brandName} (ID: ${newBrand[0].id})`);
      return newBrand[0].id;
    };

    // Fonction helper pour créer ou récupérer une catégorie
    const getOrCreateCategory = async (categoryName: string) => {
      if (!categoryName || categoryName.trim() === '') {
        categoryName = 'Non classé';
      }

      // Chercher la catégorie existante
      const { data: existingCategory, error: searchError } = await supabaseClient
        .from('categories')
        .select('id')
        .eq('name', categoryName)
        .eq('company_id', companyId)
        .limit(1);

      if (searchError) {
        console.error('WooCommerce Import: Erreur recherche catégorie:', searchError);
        return null;
      }

      if (existingCategory && existingCategory.length > 0) {
        console.log(`WooCommerce Import: Catégorie existante trouvée: ${categoryName} (ID: ${existingCategory[0].id})`);
        return existingCategory[0].id;
      }

      // Créer la catégorie si elle n'existe pas
      const { data: newCategory, error: createError } = await supabaseClient
        .from('categories')
        .insert({
          name: categoryName,
          translation: categoryName,
          company_id: companyId
        })
        .select('id');

      if (createError) {
        console.error('WooCommerce Import: Erreur création catégorie:', createError);
        return null;
      }

      console.log(`WooCommerce Import: Nouvelle catégorie créée: ${categoryName} (ID: ${newCategory[0].id})`);
      return newCategory[0].id;
    };

    // Fonction pour traiter les attributs et créer la structure pour variation_attributes
    const processAttributes = (attributes: Array<{ id: number; name: string; options: string[]; variation?: boolean }>) => {
      const productAttributes: Record<string, string> = {};
      const variationAttributes: Record<string, string[]> = {};
      
      attributes.forEach(attr => {
        if (attr.variation) {
          // Attribut utilisé pour les variantes
          variationAttributes[attr.name] = attr.options || [];
        } else {
          // Attribut standard du produit
          productAttributes[attr.name] = attr.options?.join(', ') || '';
        }
      });

      return { productAttributes, variationAttributes };
    };

    // Fonction pour récupérer les variantes d'un produit
    const fetchProductVariations = async (productId: number): Promise<WooCommerceVariation[]> => {
      try {
        const response = await fetch(
          `${config.site_url}/wp-json/wc/v3/products/${productId}/variations?per_page=100`,
          {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          console.warn(`Erreur récupération variantes pour produit ${productId}: ${response.status}`);
          return [];
        }

        const variations = await response.json();
        console.log(`WooCommerce Import: ${variations.length} variantes trouvées pour produit ${productId}`);
        return variations;
      } catch (error) {
        console.error(`Erreur récupération variantes pour produit ${productId}:`, error);
        return [];
      }
    };

    // Fonction pour créer des prix de variantes
    const createVariantPrices = async (productId: string, variations: WooCommerceVariation[]) => {
      for (const variation of variations) {
        try {
          const attributes: Record<string, string> = {};
          variation.attributes.forEach(attr => {
            attributes[attr.name] = attr.option;
          });

          const price = parseFloat(variation.price || variation.regular_price || '0');
          
          if (price > 0) {
            await supabaseClient
              .from('product_variant_prices')
              .insert({
                product_id: productId,
                attributes: attributes,
                price: 0, // Prix d'achat par défaut
                monthly_price: price,
                stock: null
              });
            
            console.log(`WooCommerce Import: Prix de variante créé pour ${JSON.stringify(attributes)}: ${price}€`);
          }
        } catch (error) {
          console.error('Erreur création prix variante:', error);
        }
      }
    };

    for (let i = 0; i < productIds.length; i++) {
      const productId = productIds[i];
      console.log(`WooCommerce Import: Traitement produit ${i + 1}/${productIds.length} - ID: ${productId}`);
      
      try {
        const response = await fetch(
          `${config.site_url}/wp-json/wc/v3/products/${productId}`,
          {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          console.error(`WooCommerce Import: Erreur récupération produit ${productId}: ${response.status}`);
          errors.push(`Produit ${productId}: ${response.status} ${response.statusText}`);
          continue;
        }

        const wooProduct = await response.json();
        console.log(`WooCommerce Import: Produit WC récupéré: ${wooProduct.name} (Type: ${wooProduct.type})`);
        
        // Extraire marque et catégorie
        const brandName = extractBrand(wooProduct);
        const categoryName = wooProduct.categories?.[0]?.name || 'Non catégorisé';
        
        // Récupérer ou créer les IDs de marque et catégorie
        const brandId = await getOrCreateBrand(brandName);
        const categoryId = await getOrCreateCategory(categoryName);

        if (!brandId || !categoryId) {
          console.error(`WooCommerce Import: Impossible de créer/récupérer marque ou catégorie pour ${wooProduct.name}`);
          errors.push(`${wooProduct.name}: Erreur création marque/catégorie`);
          continue;
        }

        // Traiter les attributs
        const { productAttributes, variationAttributes } = processAttributes(wooProduct.attributes || []);
        
        // Convertir le produit WooCommerce vers notre format
        const wooPrice = parseFloat(wooProduct.price || wooProduct.regular_price || '0');
        const isVariable = wooProduct.type === 'variable';
        const isVariation = wooProduct.type === 'variation';
        
        const productData = {
          name: wooProduct.name,
          description: wooProduct.description || wooProduct.short_description || '',
          price: 0, // Prix d'achat par défaut à 0
          purchase_price: 0, // Prix d'achat par défaut à 0  
          monthly_price: isVariable ? 0 : wooPrice, // Pas de prix pour les produits variables
          image_url: wooProduct.images?.[0]?.src || null,
          brand_name: brandName,
          category_name: categoryName,
          brand_id: brandId,
          category_id: categoryId,
          specifications: formatSpecifications(wooProduct.attributes),
          attributes: productAttributes,
          variation_attributes: Object.keys(variationAttributes).length > 0 ? variationAttributes : null,
          is_parent: isVariable,
          parent_id: isVariation ? wooProduct.parent_id?.toString() : null,
          company_id: companyId,
          active: true,
          woocommerce_id: wooProduct.id.toString(),
          slug: wooProduct.slug || wooProduct.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
        };

        console.log(`WooCommerce Import: Données produit formatées:`, {
          name: productData.name,
          type: wooProduct.type,
          is_parent: productData.is_parent,
          parent_id: productData.parent_id,
          has_variation_attributes: Object.keys(variationAttributes).length > 0,
          price: productData.price,
          monthly_price: productData.monthly_price,
          company_id: productData.company_id
        });

        // Insérer dans la base de données
        console.log(`WooCommerce Import: Insertion en base pour ${productData.name}`);
        const { data: insertedProduct, error } = await supabaseClient
          .from('products')
          .insert(productData)
          .select()
          .single();

        if (error) {
          console.error(`WooCommerce Import: Erreur insertion produit ${productData.name}:`, error);
          errors.push(`${productData.name}: ${error.message}`);
        } else if (insertedProduct) {
          console.log(`WooCommerce Import: Produit ${productData.name} importé avec succès`);
          importedProducts.push(insertedProduct);

          // Si c'est un produit variable, récupérer et traiter ses variantes
          if (isVariable && wooProduct.variations && wooProduct.variations.length > 0) {
            console.log(`WooCommerce Import: Traitement des variantes pour ${productData.name}`);
            const variations = await fetchProductVariations(wooProduct.id);
            
            if (variations.length > 0) {
              await createVariantPrices(insertedProduct.id, variations);
              
              // Mettre à jour le produit parent avec les IDs des variantes (optionnel)
              const variantIds = variations.map(v => v.id.toString());
              await supabaseClient
                .from('products')
                .update({ variants_ids: variantIds })
                .eq('id', insertedProduct.id);
            }
          }
        }
      } catch (productError) {
        console.error(`WooCommerce Import: Erreur traitement produit ${productId}:`, productError);
        errors.push(`Produit ${productId}: ${productError.message}`);
      }
    }

    console.log(`WooCommerce Import: Terminé - ${importedProducts.length} importés, ${errors.length} erreurs`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        imported: importedProducts.length,
        products: importedProducts,
        errors: errors.length > 0 ? errors : undefined,
        total_processed: productIds.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('WooCommerce Import: Erreur générale dans importProducts:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error.stack || 'Pas de détails disponibles'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

function formatProduct(product: WooCommerceProduct) {
  const wooPrice = parseFloat(product.price || product.regular_price || '0');
  return {
    id: product.id,
    name: product.name,
    description: product.description || product.short_description || '',
    price: 0, // Prix d'achat par défaut à 0
    monthly_price: wooPrice, // Le prix WooCommerce est déjà la mensualité
    imageUrl: product.images?.[0]?.src || null,
    brand: extractBrand(product),
    category: product.categories?.[0]?.name || 'Non catégorisé',
    specifications: formatSpecifications(product.attributes),
    slug: product.slug
  };
}

function extractBrand(product: WooCommerceProduct): string {
  // Chercher la marque dans les attributs
  const brandAttribute = product.attributes?.find(attr => 
    attr.name.toLowerCase().includes('brand') || 
    attr.name.toLowerCase().includes('marque') ||
    attr.name.toLowerCase().includes('manufacturer')
  );
  
  if (brandAttribute && brandAttribute.options?.length > 0) {
    return brandAttribute.options[0];
  }

  // Chercher dans les métadonnées
  const brandMeta = product.meta_data?.find(meta => 
    meta.key.toLowerCase().includes('brand') || 
    meta.key.toLowerCase().includes('marque')
  );
  
  if (brandMeta) {
    return brandMeta.value.toString();
  }

  return 'Non spécifié';
}

function formatSpecifications(attributes: Array<{ name: string; options: string[] }> = {}): Record<string, any> {
  const specs: Record<string, any> = {};
  
  if (Array.isArray(attributes)) {
    attributes.forEach(attr => {
      if (attr.name && attr.options) {
        specs[attr.name] = attr.options.join(', ');
      }
    });
  }
  
  return specs;
}

function calculateMonthlyPrice(price: number): number {
  // Le prix WooCommerce est déjà la mensualité, pas besoin de diviser
  return Math.round(price * 100) / 100;
}