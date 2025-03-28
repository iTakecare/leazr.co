
import { useState, useEffect, useRef } from "react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

export const useExistingStorageBucket = (bucketName: string, onSuccess: () => Promise<void>) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bucketReady, setBucketReady] = useState(false);
  const bucketCheckInProgressRef = useRef(false);
  const successCallbackCalledRef = useRef(false);
  
  useEffect(() => {
    // Reset on new bucket name
    setBucketReady(false);
    setError(null);
    successCallbackCalledRef.current = false;
    
    const checkBucket = async () => {
      // Prevent concurrent calls
      if (bucketCheckInProgressRef.current) return;
      bucketCheckInProgressRef.current = true;
      
      try {
        console.log(`Checking bucket access: ${bucketName}`);
        setIsLoading(true);
        setError(null);
        
        // First try to list the bucket to see if it exists and is accessible
        const { data: listData, error: listError } = await supabase.storage.from(bucketName).list();
        
        if (!listError) {
          console.log(`Successfully accessed bucket ${bucketName}`);
          setBucketReady(true);
          setIsLoading(false);
          
          if (!successCallbackCalledRef.current) {
            successCallbackCalledRef.current = true;
            await onSuccess();
          }
          
          bucketCheckInProgressRef.current = false;
          return;
        }
        
        // If we couldn't access the bucket, it might not exist or we don't have permissions
        console.log(`Could not list bucket: ${listError.message}`);
        
        // Try a simpler approach - check if the bucket exists without trying to modify it
        if (listError.message.includes('does not exist') || listError.message.includes('The resource was not found')) {
          // The bucket doesn't exist, display an error message
          console.error(`Bucket ${bucketName} does not exist`);
          setError(`Le stockage "${bucketName}" n'existe pas. Veuillez contacter l'administrateur.`);
          setIsLoading(false);
          setBucketReady(false);
          bucketCheckInProgressRef.current = false;
          return;
        }
        
        // If we're here, the bucket might exist but we don't have permission to access it
        console.error(`Error accessing bucket ${bucketName}: ${listError.message}`);
        setError(`Erreur d'accès au stockage "${bucketName}". Veuillez contacter l'administrateur.`);
        setIsLoading(false);
        setBucketReady(false);
      } catch (err) {
        console.error(`Unexpected error checking bucket ${bucketName}:`, err);
        setError(`Erreur inattendue lors de la vérification du bucket ${bucketName}`);
        setIsLoading(false);
        setBucketReady(false);
      } finally {
        bucketCheckInProgressRef.current = false;
      }
    };
    
    // Only check if we have a bucket name
    if (bucketName) {
      checkBucket();
    } else {
      setIsLoading(false);
      setError("No bucket name provided");
    }
    
    // Cleanup function
    return () => {
      bucketCheckInProgressRef.current = false;
    };
  }, [bucketName, onSuccess]);
  
  return { error, isLoading, bucketReady };
};
