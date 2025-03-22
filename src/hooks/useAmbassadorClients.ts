
import { useState, useEffect } from 'react';
import { Client, CreateClientData } from '@/types/client';
import { getAmbassadorClients } from '@/services/ambassadorClientService';
import { createClient } from '@/services/clientService';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { getCurrentAmbassadorProfile, linkClientToAmbassador } from '@/services/ambassadorClientService';

export const useAmbassadorClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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
        return false;
      }
      
      // 2. Créer le client
      const newClient = await createClient(clientData);
      
      if (!newClient) {
        toast.error("Échec de la création du client");
        return false;
      }
      
      // 3. Lier le client à l'ambassadeur
      const linked = await linkClientToAmbassador(newClient.id, ambassadorId);
      
      if (linked) {
        toast.success("Client créé et associé à votre compte ambassadeur");
        
        // 4. Recharger la liste des clients
        await loadClients();
        
        return true;
      } else {
        toast.warning("Client créé mais impossible de l'associer à votre compte. Veuillez contacter l'administrateur.");
        return false;
      }
    } catch (err) {
      console.error("Error creating client as ambassador:", err);
      toast.error("Erreur lors de la création du client");
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
