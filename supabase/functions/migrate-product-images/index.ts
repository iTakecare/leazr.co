import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MigrationResult {
  productId: string;
  productName: string;
  oldUrl: string;
  newUrl?: string;
  status: 'success' | 'error' | 'skipped';
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Starting image migration for user:', user.id);

    // Récupérer le company_id de l'utilisateur
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    const companyId = profile?.company_id;
    if (!companyId) {
      throw new Error('Company ID not found');
    }

    console.log('Company ID:', companyId);

    // Récupérer tous les produits avec des images externes
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, image_url')
      .eq('company_id', companyId)
      .not('image_url', 'is', null)
      .not('image_url', 'like', '%supabase.co%')
      .not('image_url', 'like', '%placeholder%');

    if (productsError) {
      throw productsError;
    }

    console.log(`Found ${products?.length || 0} products with external images`);

    const results: MigrationResult[] = [];

    for (const product of products || []) {
      console.log(`Processing product: ${product.name} (${product.id})`);
      
      try {
        if (!product.image_url) {
          results.push({
            productId: product.id,
            productName: product.name,
            oldUrl: '',
            status: 'skipped',
            error: 'No image URL',
          });
          continue;
        }

        // Télécharger l'image depuis l'URL externe
        console.log(`Downloading image from: ${product.image_url}`);
        const imageResponse = await fetch(product.image_url);
        
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.status}`);
        }

        const imageBlob = await imageResponse.blob();
        const arrayBuffer = await imageBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Déterminer l'extension du fichier
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
        const extension = contentType.split('/')[1] || 'jpg';
        
        // Créer le chemin du fichier dans Supabase Storage
        const fileName = `image-${Date.now()}.${extension}`;
        const filePath = `company-${companyId}/products/${product.id}/${fileName}`;

        console.log(`Uploading to: ${filePath}`);

        // Upload vers Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, uint8Array, {
            contentType,
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        // Obtenir l'URL publique
        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        const newUrl = urlData.publicUrl;
        console.log(`New URL: ${newUrl}`);

        // Mettre à jour la base de données
        const { error: updateError } = await supabase
          .from('products')
          .update({ image_url: newUrl })
          .eq('id', product.id);

        if (updateError) {
          throw updateError;
        }

        results.push({
          productId: product.id,
          productName: product.name,
          oldUrl: product.image_url,
          newUrl,
          status: 'success',
        });

        console.log(`Successfully migrated image for: ${product.name}`);

      } catch (error) {
        console.error(`Error migrating image for ${product.name}:`, error);
        results.push({
          productId: product.id,
          productName: product.name,
          oldUrl: product.image_url || '',
          status: 'error',
          error: error.message,
        });
      }
    }

    const summary = {
      total: results.length,
      success: results.filter(r => r.status === 'success').length,
      errors: results.filter(r => r.status === 'error').length,
      skipped: results.filter(r => r.status === 'skipped').length,
    };

    console.log('Migration complete:', summary);

    return new Response(
      JSON.stringify({ summary, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in migrate-product-images:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
