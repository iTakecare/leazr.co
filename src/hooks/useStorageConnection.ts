
import { useState, useCallback } from "react";
import { toast } from "sonner";

export const useStorageConnection = (onConnectionSuccess: () => Promise<void>) => {
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);

  const initializeStorage = useCallback(async () => {
    try {
      setError(null);
      
      // On ne tente pas d'accéder au stockage Supabase directement
      // On exécute simplement la fonction de callback fournie
      try {
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
      
      toast.info("Tentative de reconnexion...");
      
      try {
        await onConnectionSuccess();
        toast.success("Connexion établie");
      } catch (err) {
        console.error("Erreur lors de la tentative de connexion:", err);
        setError("Erreur lors de la tentative de connexion au stockage.");
        toast.error("Erreur lors de la tentative de connexion au stockage.");
      } finally {
        setReconnecting(false);
      }
    } catch (err) {
      console.error("Erreur lors de la tentative de connexion:", err);
      setError("Erreur lors de la tentative de connexion au stockage.");
      toast.error("Erreur lors de la tentative de connexion au stockage.");
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
