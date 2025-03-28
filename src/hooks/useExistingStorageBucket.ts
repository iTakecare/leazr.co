
import { useState, useEffect } from "react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

export const useExistingStorageBucket = (bucketName: string, onSuccess: () => Promise<void>) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const checkBucket = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Check if the bucket exists
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        
        if (listError) {
          console.error(`Error checking bucket ${bucketName}:`, listError);
          setError(`Storage access error. ${listError.message}`);
          return;
        }
        
        const bucketExists = buckets.some(bucket => bucket.name === bucketName);
        
        if (!bucketExists) {
          console.error(`Bucket ${bucketName} doesn't exist`);
          setError(`Bucket ${bucketName} doesn't exist`);
          return;
        }
        
        // Verify we can access the bucket by listing its contents
        const { error: accessError } = await supabase.storage.from(bucketName).list();
        
        if (accessError) {
          console.error(`Error accessing bucket ${bucketName}:`, accessError);
          setError(`Error accessing bucket ${bucketName}: ${accessError.message}`);
          return;
        }
        
        // Bucket exists and is accessible, call success callback
        await onSuccess();
      } catch (err) {
        console.error(`Error checking bucket ${bucketName}:`, err);
        setError(`Error checking bucket ${bucketName}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkBucket();
  }, [bucketName, onSuccess]);
  
  return { error, isLoading };
};
