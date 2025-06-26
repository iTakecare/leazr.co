
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { bucket_name } = await req.json();

    console.log(`Creating bucket: ${bucket_name}`);

    // Créer le bucket s'il n'existe pas
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucket_name);

    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket(bucket_name, {
        public: false, // Les documents d'offres ne sont pas publics par défaut
        fileSizeLimit: 10485760 // 10MB
      });

      if (createError && !createError.message.includes('already exists')) {
        throw createError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Bucket ${bucket_name} created or already exists`
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  } catch (error) {
    console.error("Error creating bucket:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
});
