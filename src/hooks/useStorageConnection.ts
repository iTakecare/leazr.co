
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { checkStorageConnection, resetStorageConnection } from "@/services/fileStorage";

export const useStorageConnection = (onConnectionSuccess: () => Promise<void>) => {
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);

  const initializeStorage = useCallback(async () => {
    try {
      setError(null);
      
      try {
        // Essayer de se connecter au stockage Supabase
        // Exécuter d'abord la fonction de chargement, si elle échoue en raison d'un problème de stockage,
        // nous le détecterons dans le bloc catch
        await onConnectionSuccess();
      } catch (storageError) {
        console.error("Erreur avec le stockage:", storageError);
        setError("Erreur lors de la connexion au stockage Supabase.");
        toast.error("Erreur lors de la connexion au stockage Supabase.");
      }
    } catch (err) {
      console.error("Erreur lors de l'initialisation:", err);
      setError("Erreur lors de l'initialisation du gestionnaire");
    }
  }, [onConnectionSuccess]);

  const retryConnection = useCallback(async () => {
    try {
      setReconnecting(true);
      setError(null);
      
      toast.info("Tentative de reconnexion au stockage...");
      
      // Essayons de créer le bucket via la fonction Edge
      try {
        const response = await fetch('/api/create-storage-bucket', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ bucketName: 'product-images' }),
        });

        if (response.ok) {
          console.log("Bucket créé avec succès via Edge Function");
          toast.success("Connexion au stockage établie");
          
          await onConnectionSuccess();
          return;
        }
      } catch (edgeFnError) {
        console.error("Erreur lors de l'appel Edge Function:", edgeFnError);
      }
      
      // Si l'Edge Function échoue, essayons une approche directe
      await onConnectionSuccess();
      
    } catch (err) {
      console.error("Erreur lors de la tentative de connexion:", err);
      setError("Erreur lors de la tentative de connexion au stockage.");
      toast.error("Erreur lors de la tentative de connexion au stockage.");
    } finally {
      setReconnecting(false);
    }
  }, [onConnectionSuccess]);

  return {
    error,
    reconnecting,
    initializeStorage,
    retryConnection
  };
};
