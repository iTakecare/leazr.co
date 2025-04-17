
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  try {
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
        { headers: { "Content-Type": "application/json" }, status: 500 }
      );
    }

    // If bucket already exists, return success
    if (buckets.some(bucket => bucket.name === bucketName)) {
      return new Response(
        JSON.stringify({ success: true, message: `Bucket ${bucketName} already exists` }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Create the bucket
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
    });

    if (createError) {
      return new Response(
        JSON.stringify({ success: false, error: createError.message }),
        { headers: { "Content-Type": "application/json" }, status: 500 }
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
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
});
