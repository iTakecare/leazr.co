
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { requireElevatedAccess } from "../_shared/security.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const access = await requireElevatedAccess(req, corsHeaders, {
      allowedRoles: ["super_admin"],
      rateLimit: {
        endpoint: "create-blog-bucket",
        maxRequests: 5,
        windowSeconds: 60,
        identifierPrefix: "create-blog-bucket",
      },
    });

    if (!access.ok) {
      return access.response;
    }

    // Create a Supabase client with the service role key
    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // Create bucket with standardized name (use dash instead of space)
    const bucketName = "blog-images";

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      return new Response(
        JSON.stringify({ success: false, error: listError.message }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 500 }
      );
    }

    // If bucket already exists, return success
    if (buckets.some(bucket => bucket.name === bucketName)) {
      return new Response(
        JSON.stringify({ success: true, message: `Bucket ${bucketName} already exists` }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create the bucket
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
    });

    if (createError) {
      return new Response(
        JSON.stringify({ success: false, error: createError.message }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 500 }
      );
    }

    // Add public access policy
    const { error: policyError } = await supabase.storage.from(bucketName).createSignedUrl('dummy.txt', 1);
    
    if (policyError && !policyError.message.includes('not found')) {
      console.error("Error testing bucket policy:", policyError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Bucket ${bucketName} created successfully` 
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }),
      { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 500 }
    );
  }
});
