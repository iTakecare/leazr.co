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
  description: string;
  short_description: string;
  price: string;
  regular_price: string;
  sale_price: string;
  images: Array<{ src: string; alt: string }>;
  categories: Array<{ id: number; name: string }>;
  attributes: Array<{ id: number; name: string; options: string[] }>;
  meta_data: Array<{ key: string; value: any }>;
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
        console.log(`WooCommerce Import: Produit WC récupéré: ${wooProduct.name}`);
        
        // Convertir le produit WooCommerce vers notre format
        const productData = {
          name: wooProduct.name,
          description: wooProduct.description || wooProduct.short_description || '',
          price: parseFloat(wooProduct.price || wooProduct.regular_price || '0'),
          monthly_price: calculateMonthlyPrice(parseFloat(wooProduct.price || '0')),
          image_url: wooProduct.images?.[0]?.src || null,
          brand: extractBrand(wooProduct),
          category: wooProduct.categories?.[0]?.name || 'Non catégorisé',
          specifications: formatSpecifications(wooProduct.attributes),
          company_id: companyId,
          active: true,
          woocommerce_id: wooProduct.id.toString(),
          slug: wooProduct.slug
        };

        console.log(`WooCommerce Import: Données produit formatées:`, {
          name: productData.name,
          price: productData.price,
          company_id: productData.company_id,
          brand: productData.brand
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
  return {
    id: product.id,
    name: product.name,
    description: product.description || product.short_description || '',
    price: parseFloat(product.price || product.regular_price || '0'),
    monthly_price: calculateMonthlyPrice(parseFloat(product.price || '0')),
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
  // Calcul simple : prix / 36 mois (durée de leasing standard)
  return Math.round((price / 36) * 100) / 100;
}