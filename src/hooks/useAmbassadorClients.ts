
import { useState, useEffect } from 'react';
import { Client, CreateClientData } from '@/types/client';
import { getAmbassadorClients, getCurrentAmbassadorProfile, linkClientToAmbassador, createClientAsAmbassadorDb } from '@/services/ambassadorClientService';
import { toast } from 'sonner';

export const useAmbassadorClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les clients de l'ambassadeur
  const loadClients = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await getAmbassadorClients();
      setClients(data);
    } catch (err) {
      console.error("Error loading ambassador clients:", err);
      setError("Impossible de charger vos clients");
      toast.error("Impossible de charger vos clients");
    } finally {
      setIsLoading(false);
    }
  };

  // Créer un nouveau client en tant qu'ambassadeur
  const createClientAsAmbassador = async (clientData: CreateClientData): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // 1. Obtenir l'ID de l'ambassadeur
      const ambassadorId = await getCurrentAmbassadorProfile();
      if (!ambassadorId) {
        toast.error("Impossible de récupérer votre profil ambassadeur");
        setError("Impossible de récupérer votre profil ambassadeur");
        return false;
      }
      
      console.log("Creating client as ambassador with ID:", ambassadorId);
      
      // 2. Utiliser notre fonction de base de données SECURITY DEFINER
      const newClientId = await createClientAsAmbassadorDb(clientData, ambassadorId);
      
      if (!newClientId) {
        toast.error("Échec de la création du client");
        setError("Échec de la création du client");
        return false;
      }
      
      toast.success("Client créé et associé à votre compte ambassadeur");
      
      // 3. Recharger la liste des clients
      await loadClients();
      
      return true;
    } catch (err) {
      console.error("Error creating client as ambassador:", err);
      toast.error("Erreur lors de la création du client");
      setError("Erreur lors de la création du client");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  return {
    clients,
    isLoading,
    error,
    loadClients,
    createClientAsAmbassador
  };
};
