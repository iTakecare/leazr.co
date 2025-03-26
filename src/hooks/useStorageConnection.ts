
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
        const isConnected = await checkStorageConnection();
        if (isConnected) {
          console.log("Connexion au stockage Supabase établie");
          toast.success("Connexion au stockage Supabase établie");
          await onConnectionSuccess();
        } else {
          console.log("Stockage Supabase non disponible");
          setError("Connexion au stockage Supabase impossible. Veuillez réessayer.");
          toast.error("Connexion au stockage Supabase impossible.");
        }
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
      
      toast.info("Tentative de connexion au stockage Supabase...");
      
      const isConnected = await resetStorageConnection();
      
      if (isConnected) {
        console.log("Connexion au stockage Supabase établie");
        toast.success("Connexion au stockage Supabase établie");
        
        await onConnectionSuccess();
      } else {
        console.log("Stockage Supabase non disponible");
        setError("Connexion au stockage Supabase impossible. Veuillez réessayer.");
        toast.error("Connexion au stockage Supabase impossible.");
      }
    } catch (err) {
      console.error("Erreur lors de la tentative de connexion:", err);
      setError("Erreur lors de la tentative de connexion au stockage Supabase.");
      toast.error("Erreur lors de la tentative de connexion au stockage Supabase.");
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
