
import { useState, useEffect } from 'react';
import { Client, CreateClientData } from '@/types/client';
import { 
  getAmbassadorClients, 
  getCurrentAmbassadorProfile, 
  createClientAsAmbassadorDb, 
  updateAmbassadorClientCount,
  deleteAmbassadorClient
} from '@/services/ambassadorClientService';
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
      console.log("Loading ambassador clients...");
      const data = await getAmbassadorClients();
      console.log("Loaded clients:", data);
      setClients(data);
    } catch (err) {
      console.error("Error loading ambassador clients:", err);
      const errorMessage = err instanceof Error ? err.message : "Impossible de charger vos clients";
      setError(errorMessage);
      toast.error(errorMessage);
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
      
      // 3. Mettre à jour explicitement le compteur de clients de l'ambassadeur
      await updateAmbassadorClientCount(ambassadorId);
      
      toast.success("Client créé et associé à votre compte ambassadeur");
      
      // 4. Recharger la liste des clients
      await loadClients();
      
      return true;
    } catch (err) {
      console.error("Error creating client as ambassador:", err);
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la création du client";
      toast.error(errorMessage);
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Supprimer un client ambassadeur
  const deleteClient = async (clientId: string): Promise<void> => {
    try {
      await deleteAmbassadorClient(clientId);
      toast.success("Client supprimé avec succès");
      await loadClients(); // Recharger la liste
    } catch (err) {
      console.error("Error deleting client:", err);
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la suppression du client";
      toast.error(errorMessage);
      throw err;
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
    createClientAsAmbassador,
    deleteClient
  };
};
