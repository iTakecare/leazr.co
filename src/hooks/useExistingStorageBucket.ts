
import { useState, useEffect } from "react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { ensureStorageBucket } from "@/services/storageService";

export const useExistingStorageBucket = (bucketName: string, onSuccess: () => Promise<void>) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCreationBeenAttempted, setHasCreationBeenAttempted] = useState(false);
  
  useEffect(() => {
    const checkBucket = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // First, try to create/ensure the bucket exists
        if (!hasCreationBeenAttempted) {
          const bucketCreated = await ensureStorageBucket(bucketName);
          setHasCreationBeenAttempted(true);
          
          if (!bucketCreated) {
            console.error(`Error: Could not access or create bucket ${bucketName}`);
            setError(`Storage access error. Could not access or create bucket ${bucketName}.`);
            setIsLoading(false);
            return;
          }
        }
        
        // Verify bucket access by listing its contents
        const { error: accessError } = await supabase.storage.from(bucketName).list();
        
        if (accessError) {
          console.error(`Error accessing bucket ${bucketName}:`, accessError);
          setError(`Error accessing bucket ${bucketName}: ${accessError.message}`);
          setIsLoading(false);
          return;
        }
        
        // Bucket exists and is accessible, call success callback
        await onSuccess();
        setIsLoading(false);
      } catch (err) {
        console.error(`Error checking bucket ${bucketName}:`, err);
        setError(`Error checking bucket ${bucketName}`);
        setIsLoading(false);
      }
    };
    
    checkBucket();
  }, [bucketName, onSuccess, hasCreationBeenAttempted]);
  
  return { error, isLoading };
};
