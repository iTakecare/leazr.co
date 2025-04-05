
// Create this file if it doesn't exist already
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

serve(async (req) => {
  try {
    // Get the request body
    const { bucketName } = await req.json();
    
    if (!bucketName) {
      return new Response(
        JSON.stringify({ success: false, message: 'Bucket name is required' }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Create Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      { auth: { persistSession: false } }
    );
    
    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      return new Response(
        JSON.stringify({ success: false, message: `Error listing buckets: ${listError.message}` }),
        { headers: { 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // If bucket already exists, return success
    if (buckets.some(bucket => bucket.name === bucketName)) {
      return new Response(
        JSON.stringify({ success: true, message: `Bucket ${bucketName} already exists` }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Create the bucket
    const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
      public: true
    });
    
    if (createError) {
      return new Response(
        JSON.stringify({ success: false, message: `Error creating bucket: ${createError.message}` }),
        { headers: { 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Create policies to make the bucket public
    try {
      await supabaseAdmin.rpc('create_storage_policy', {
        bucket_name: bucketName,
        policy_name: `${bucketName}_public_select`,
        definition: 'TRUE',
        policy_type: 'SELECT'
      });
      
      await supabaseAdmin.rpc('create_storage_policy', {
        bucket_name: bucketName,
        policy_name: `${bucketName}_public_insert`,
        definition: 'TRUE',
        policy_type: 'INSERT'
      });
    } catch (policyError) {
      console.error('Policy creation error:', policyError);
      // Continue even if policy creation fails
    }
    
    return new Response(
      JSON.stringify({ success: true, message: `Bucket ${bucketName} created successfully` }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: `Unexpected error: ${error.message}` }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
