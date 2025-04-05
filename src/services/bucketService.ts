
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Checks if a bucket exists and has appropriate public access
 */
export const checkBucketAccess = async (bucketName: string): Promise<boolean> => {
  try {
    console.log(`Checking bucket access for: ${bucketName}`);
    
    // Try to list files to verify read access
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list();
    
    if (!error) {
      console.log(`Successfully verified bucket access for: ${bucketName}`);
      return true;
    }
    
    // If error code is 404, bucket doesn't exist
    if (error.message.includes('not found') || error.status === 404) {
      console.log(`Bucket ${bucketName} not found`);
      toast.error(`Le bucket "${bucketName}" n'existe pas dans votre projet Supabase.`);
      return false;
    }
    
    // If other error, there might be a permissions issue
    console.error(`Error accessing bucket ${bucketName}:`, error);
    return false;
  } catch (error) {
    console.error(`Exception checking bucket ${bucketName}:`, error);
    return false;
  }
};

/**
 * Initializes storage with bucket and authentication
 */
export const initStorage = async (): Promise<void> => {
  const requiredBuckets = ['site-settings', 'avatars', 'product-images'];
  
  for (const bucket of requiredBuckets) {
    const hasAccess = await checkBucketAccess(bucket);
    
    if (!hasAccess) {
      console.log(`Need to create bucket: ${bucket}`);
      toast.info(`Pour corriger cette erreur, vous devez créer le bucket "${bucket}" dans votre projet Supabase.`);
    }
  }
};
