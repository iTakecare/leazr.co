
import { useState, useEffect } from "react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { ensureStorageBucket } from "@/services/storageService";

export const useExistingStorageBucket = (bucketName: string, onSuccess: () => Promise<void>) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCreationBeenAttempted, setHasCreationBeenAttempted] = useState(false);
  const [bucketReady, setBucketReady] = useState(false);
  
  useEffect(() => {
    const checkBucket = async () => {
      try {
        console.log(`Checking bucket: ${bucketName}`);
        setIsLoading(true);
        setError(null);
        
        // Try to create/ensure the bucket exists
        if (!hasCreationBeenAttempted) {
          console.log(`Attempting to create/ensure bucket: ${bucketName}`);
          const bucketCreated = await ensureStorageBucket(bucketName);
          setHasCreationBeenAttempted(true);
          
          if (!bucketCreated) {
            console.error(`Error: Could not access or create bucket ${bucketName}`);
            setError(`Storage access error. Could not access or create bucket ${bucketName}.`);
            setIsLoading(false);
            return;
          }
          
          console.log(`Bucket ${bucketName} is now ready`);
          setBucketReady(true);
        }
        
        // Double-check bucket access by trying to list contents
        if (bucketReady || hasCreationBeenAttempted) {
          console.log(`Verifying bucket access to ${bucketName} by listing contents`);
          const { error: accessError } = await supabase.storage.from(bucketName).list();
          
          if (accessError) {
            console.error(`Error accessing bucket ${bucketName}:`, accessError);
            setError(`Error accessing bucket ${bucketName}: ${accessError.message}`);
            setIsLoading(false);
            return;
          }
          
          // Bucket exists and is accessible, call success callback
          console.log(`Bucket ${bucketName} verified, calling success callback`);
          await onSuccess();
          setIsLoading(false);
        }
      } catch (err) {
        console.error(`Unexpected error checking bucket ${bucketName}:`, err);
        setError(`Unexpected error checking bucket ${bucketName}`);
        setIsLoading(false);
      }
    };
    
    checkBucket();
  }, [bucketName, onSuccess, hasCreationBeenAttempted, bucketReady]);
  
  return { error, isLoading };
};
