
import { useState, useEffect, useRef } from "react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

/**
 * Hook pour vérifier si un bucket existe dans le stockage Supabase
 * Utile pour s'assurer qu'un bucket est disponible avant d'effectuer des opérations
 */
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
        
        // Si l'accès est réussi, on considère que le bucket est prêt
        if (!listError) {
          console.log(`Successfully accessed bucket ${bucketName}`);
          setBucketReady(true);
          setIsLoading(false);
          
          // N'exécuter le callback de succès qu'une seule fois par montage du composant
          if (!successCallbackCalledRef.current) {
            successCallbackCalledRef.current = true;
            await onSuccess();
          }
          
          bucketCheckInProgressRef.current = false;
          return;
        }
        
        // If we couldn't access the bucket, try to get it created via RPC
        if (listError.message.includes('does not exist')) {
          console.log(`Bucket ${bucketName} does not exist, attempting to create via RPC`);
          
          // Tenter de créer le bucket via une fonction RPC sécurisée
          const { error: rpcError } = await supabase.rpc('create_storage_bucket', { 
            bucket_name: bucketName 
          });
          
          if (!rpcError) {
            console.log(`Successfully requested bucket creation for ${bucketName}`);
            setBucketReady(true);
            setIsLoading(false);
            
            if (!successCallbackCalledRef.current) {
              successCallbackCalledRef.current = true;
              await onSuccess();
            }
            
            bucketCheckInProgressRef.current = false;
            return;
          } else {
            console.error(`Error creating bucket via RPC: ${rpcError.message}`);
            setError(`Erreur lors de la création du bucket: ${rpcError.message}`);
          }
        } else {
          console.error(`Error accessing bucket ${bucketName}: ${listError.message}`);
          setError(`Erreur d'accès au bucket: ${listError.message}`);
        }
        
        setIsLoading(false);
        setBucketReady(false);
      } catch (err) {
        console.error(`Unexpected error checking bucket ${bucketName}:`, err);
        setError(`Erreur inattendue lors de la vérification du bucket`);
        setIsLoading(false);
        setBucketReady(false);
      } finally {
        bucketCheckInProgressRef.current = false;
      }
    };
    
    if (bucketName) {
      checkBucket();
    } else {
      setIsLoading(false);
      setError("Aucun nom de bucket fourni");
    }
    
    return () => {
      bucketCheckInProgressRef.current = false;
    };
  }, [bucketName, onSuccess]);
  
  return { error, isLoading, bucketReady };
};

export default useExistingStorageBucket;
