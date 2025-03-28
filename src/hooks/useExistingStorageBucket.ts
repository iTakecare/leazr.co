
import { useState, useEffect, useRef } from "react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { ensureStorageBucket } from "@/services/storageService";

export const useExistingStorageBucket = (bucketName: string, onSuccess: () => Promise<void>) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bucketReady, setBucketReady] = useState(false);
  const bucketCheckInProgressRef = useRef(false);
  const successCallbackCalledRef = useRef(false);
  
  useEffect(() => {
    // Prévenir les appels en boucle en utilisant une référence
    if (bucketCheckInProgressRef.current) return;
    
    const checkBucket = async () => {
      // Éviter les appels en parallèle
      if (bucketCheckInProgressRef.current) return;
      bucketCheckInProgressRef.current = true;
      
      try {
        console.log(`Checking bucket: ${bucketName}`);
        setIsLoading(true);
        setError(null);
        
        // Essayer de créer/vérifier que le bucket existe
        const bucketCreated = await ensureStorageBucket(bucketName);
        
        if (!bucketCreated) {
          console.error(`Error: Could not access or create bucket ${bucketName}`);
          setError(`Erreur d'accès au stockage. Impossible d'accéder au bucket ${bucketName}.`);
          setIsLoading(false);
          setBucketReady(false);
          bucketCheckInProgressRef.current = false;
          return;
        }
        
        console.log(`Bucket ${bucketName} is now ready`);
        setBucketReady(true);
        
        // Vérifier l'accès au bucket en essayant de lister son contenu
        console.log(`Verifying bucket access to ${bucketName} by listing contents`);
        const { error: accessError } = await supabase.storage.from(bucketName).list();
        
        if (accessError) {
          console.error(`Error accessing bucket ${bucketName}:`, accessError);
          setError(`Erreur d'accès au bucket ${bucketName}: ${accessError.message}`);
          setIsLoading(false);
          setBucketReady(false);
          bucketCheckInProgressRef.current = false;
          return;
        }
        
        // Le bucket existe et est accessible, appeler le callback de succès s'il n'a pas déjà été appelé
        if (!successCallbackCalledRef.current) {
          console.log(`Bucket ${bucketName} verified, calling success callback`);
          successCallbackCalledRef.current = true;
          await onSuccess();
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error(`Unexpected error checking bucket ${bucketName}:`, err);
        setError(`Erreur inattendue lors de la vérification du bucket ${bucketName}`);
        setIsLoading(false);
        setBucketReady(false);
      } finally {
        bucketCheckInProgressRef.current = false;
      }
    };
    
    checkBucket();
    
    // Nettoyage lors du démontage du composant
    return () => {
      bucketCheckInProgressRef.current = false;
      successCallbackCalledRef.current = false;
    };
  }, [bucketName, onSuccess]);
  
  return { error, isLoading, bucketReady };
};
