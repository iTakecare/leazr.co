
import { useState, useEffect } from 'react';
import { Client, CreateClientData } from '@/types/client';
import { 
  getAmbassadorClients, 
  deleteAmbassadorClient
} from '@/services/ambassador/ambassadorClients';
import { toast } from 'sonner';

export const useAmbassadorClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les clients de l'ambassadeur
  const loadClients = async () => {
    console.log("🔍 HOOK DIAGNOSTIC - Début loadClients");
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("🔍 HOOK DIAGNOSTIC - Appel getAmbassadorClients...");
      const data = await getAmbassadorClients();
      console.log("🔍 HOOK DIAGNOSTIC - Clients chargés avec succès:", {
        count: data.length,
        clients: data.map(c => ({ id: c.id, name: c.name, email: c.email }))
      });
      setClients(data);
    } catch (err) {
      console.error("🔍 HOOK DIAGNOSTIC - Erreur lors du chargement des clients:", {
        error: err,
        errorMessage: err instanceof Error ? err.message : 'Erreur inconnue',
        errorType: typeof err
      });
      
      const errorMessage = err instanceof Error ? err.message : "Impossible de charger vos clients";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      console.log("🔍 HOOK DIAGNOSTIC - Fin loadClients");
    }
  };

  // Créer un nouveau client en tant qu'ambassadeur
  const createClientAsAmbassador = async (clientData: CreateClientData): Promise<boolean> => {
    console.log("🔍 HOOK DIAGNOSTIC - Début createClientAsAmbassador:", { clientData });
    setIsLoading(true);
    
    try {
      // Cette fonctionnalité sera implémentée plus tard si nécessaire
      toast.error("Fonctionnalité de création de client non encore implémentée");
      return false;
    } catch (err) {
      console.error("🔍 HOOK DIAGNOSTIC - Erreur lors de la création du client:", {
        error: err,
        errorMessage: err instanceof Error ? err.message : 'Erreur inconnue',
        clientData
      });
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
    console.log("🔍 HOOK DIAGNOSTIC - Début deleteClient:", { clientId });
    try {
      await deleteAmbassadorClient(clientId);
      toast.success("Client supprimé avec succès");
      console.log("🔍 HOOK DIAGNOSTIC - Client supprimé, rechargement...");
      await loadClients(); // Recharger la liste
      console.log("🔍 HOOK DIAGNOSTIC - Fin deleteClient - Succès");
    } catch (err) {
      console.error("🔍 HOOK DIAGNOSTIC - Erreur lors de la suppression:", {
        error: err,
        errorMessage: err instanceof Error ? err.message : 'Erreur inconnue',
        clientId
      });
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la suppression du client";
      toast.error(errorMessage);
      throw err;
    }
  };

  useEffect(() => {
    console.log("🔍 HOOK DIAGNOSTIC - useEffect déclenché, chargement initial...");
    loadClients();
  }, []);

  console.log("🔍 HOOK DIAGNOSTIC - État du hook:", {
    clientsCount: clients.length,
    isLoading,
    error,
    hasClients: clients.length > 0
  });

  return {
    clients,
    isLoading,
    error,
    loadClients,
    createClientAsAmbassador,
    deleteClient
  };
};
