
import { supabase, adminSupabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Creates a bucket if it doesn't exist
 * Typically runs on app startup to ensure all required buckets exist
 */
export async function initializeStorageBuckets(): Promise<void> {
  const requiredBuckets = [
    'product-images',
    'pdf-templates',
    'site-settings'
  ];
  
  try {
    // Check if we have admin access or need to use Edge Functions
    const useAdmin = adminSupabase !== null;
    console.log(`Initializing storage buckets. Using admin client: ${useAdmin}`);
    
    // Get existing buckets
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }
    
    const existingBucketNames = existingBuckets?.map(b => b.name) || [];
    console.log('Existing buckets:', existingBucketNames);
    
    // Create missing buckets
    for (const bucketName of requiredBuckets) {
      if (!existingBucketNames.includes(bucketName)) {
        console.log(`Bucket "${bucketName}" does not exist, creating it...`);
        
        try {
          if (useAdmin) {
            // Direct creation using admin client
            const { error } = await adminSupabase.storage.createBucket(bucketName, {
              public: true,
              fileSizeLimit: 52428800 // 50MB
            });
            
            if (error) {
              if (error.message === 'The resource already exists') {
                console.log(`Bucket ${bucketName} already exists`);
              } else {
                console.error(`Error creating bucket ${bucketName}:`, error);
              }
            } else {
              console.log(`Bucket ${bucketName} created successfully`);
            }
          } else {
            // Use Edge Function
            const { error } = await supabase.functions.invoke('create-storage-bucket', {
              body: { bucket_name: bucketName }
            });
            
            if (error) {
              console.error(`Error invoking create-storage-bucket function for ${bucketName}:`, error);
            } else {
              console.log(`Bucket ${bucketName} created successfully via Edge Function`);
            }
          }
        } catch (error) {
          console.error(`Exception during bucket ${bucketName} creation:`, error);
        }
      } else {
        console.log(`Bucket "${bucketName}" already exists`);
      }
    }
  } catch (error) {
    console.error('Error initializing storage buckets:', error);
    toast.error('Erreur lors de l\'initialisation du stockage');
  }
}
