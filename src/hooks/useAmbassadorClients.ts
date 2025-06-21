
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
      // 1. Obtenir l'ID de l'ambassadeur
      console.log("🔍 HOOK DIAGNOSTIC - Récupération du profil ambassadeur...");
      const ambassadorId = await getCurrentAmbassadorProfile();
      console.log("🔍 HOOK DIAGNOSTIC - Profil ambassadeur récupéré:", { ambassadorId });
      
      if (!ambassadorId) {
        const errorMsg = "Impossible de récupérer votre profil ambassadeur";
        console.error("🔍 HOOK DIAGNOSTIC - Erreur profil ambassadeur:", errorMsg);
        toast.error(errorMsg);
        setError(errorMsg);
        return false;
      }
      
      console.log("🔍 HOOK DIAGNOSTIC - Création du client via fonction DB...");
      
      // 2. Utiliser notre fonction de base de données SECURITY DEFINER
      const newClientId = await createClientAsAmbassadorDb(clientData, ambassadorId);
      
      console.log("🔍 HOOK DIAGNOSTIC - Résultat création client:", { newClientId });
      
      if (!newClientId) {
        const errorMsg = "Échec de la création du client";
        console.error("🔍 HOOK DIAGNOSTIC - Erreur création:", errorMsg);
        toast.error(errorMsg);
        setError(errorMsg);
        return false;
      }
      
      // 3. Mettre à jour explicitement le compteur de clients de l'ambassadeur
      console.log("🔍 HOOK DIAGNOSTIC - Mise à jour du compteur...");
      await updateAmbassadorClientCount(ambassadorId);
      
      toast.success("Client créé et associé à votre compte ambassadeur");
      
      // 4. Recharger la liste des clients
      console.log("🔍 HOOK DIAGNOSTIC - Rechargement de la liste...");
      await loadClients();
      
      console.log("🔍 HOOK DIAGNOSTIC - Fin createClientAsAmbassador - Succès");
      return true;
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
