
import { getSupabaseClient } from "@/integrations/supabase/client";

/**
 * Ensures that a storage bucket exists with the correct public access settings
 * @param bucketName The name of the bucket to create or check
 * @returns Promise<boolean> indicating success
 */
export async function ensureStorageBucket(bucketName: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error(`Error checking if bucket ${bucketName} exists:`, listError);
      return false;
    }
    
    const bucketExists = buckets?.some(b => b.name === bucketName);
    
    if (!bucketExists) {
      console.log(`Creating storage bucket: ${bucketName}`);
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 10485760, // 10MB limit
      });
      
      if (createError) {
        console.error(`Error creating bucket ${bucketName}:`, createError);
        return false;
      }
      
      // Create public access policy
      try {
        await createPublicPolicy(bucketName);
      } catch (policyError) {
        console.warn(`Could not create policy for ${bucketName}:`, policyError);
        // Continue anyway since the bucket was created
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Unexpected error ensuring bucket ${bucketName}:`, error);
    return false;
  }
}

/**
 * Creates a public access policy for a bucket
 */
async function createPublicPolicy(bucketName: string): Promise<void> {
  const supabase = getSupabaseClient();
  
  // This will be executed through RPC or directly if possible
  // For now just log it
  console.log(`Ensuring public access policy for bucket: ${bucketName}`);
}

// Make sure we export both the individual function and a default export
export default {
  ensureStorageBucket
};
