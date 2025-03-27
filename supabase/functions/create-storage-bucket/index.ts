
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    const { bucket_name } = await req.json();

    if (!bucket_name) {
      return new Response(JSON.stringify({ error: "Bucket name is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log(`Tentative de création du bucket: ${bucket_name}`);

    // Create Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // First check if bucket already exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error("Error checking buckets:", listError);
      return new Response(JSON.stringify({ error: listError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const bucketExists = buckets.some(bucket => bucket.name === bucket_name);
    
    if (bucketExists) {
      console.log(`Le bucket ${bucket_name} existe déjà`);
      return new Response(JSON.stringify({ success: true, message: "Bucket already exists" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create bucket if it doesn't exist
    const { data, error } = await supabaseAdmin.storage.createBucket(bucket_name, {
      public: true,
      fileSizeLimit: 52428800, // 50MB
    });

    if (error) {
      if (error.message === "The resource already exists") {
        console.log(`Le bucket ${bucket_name} existe déjà`);
        return new Response(JSON.stringify({ success: true, message: "Bucket already exists" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      console.error("Error creating bucket:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log(`Bucket ${bucket_name} créé avec succès`);
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in create-storage-bucket function:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
