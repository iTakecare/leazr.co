
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
        
        // Just check if the bucket exists (don't try to create it)
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        
        if (listError) {
          console.error(`Erreur lors de la vérification du bucket ${bucketName}:`, listError);
          setError(`Erreur d'accès au stockage. ${listError.message}`);
          return;
        }
        
        const bucketExists = buckets.some(bucket => bucket.name === bucketName);
        
        if (!bucketExists) {
          console.error(`Le bucket ${bucketName} n'existe pas`);
          setError(`Le bucket ${bucketName} n'existe pas`);
          return;
        }
        
        // Bucket exists, call success callback
        await onSuccess();
      } catch (err) {
        console.error(`Erreur lors de la vérification du bucket ${bucketName}:`, err);
        setError(`Erreur lors de la vérification du bucket ${bucketName}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkBucket();
  }, [bucketName, onSuccess]);
  
  return { error, isLoading };
};
