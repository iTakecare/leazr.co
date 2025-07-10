
import { useState, useEffect, useCallback } from 'react';
import { getAllClients } from '@/services/clientService';
import type { Client as ClientType } from '@/types/client';
import { toast } from 'sonner';
import { getCurrentUserCompanyId } from '@/services/multiTenantService';
import { checkDataIsolation } from '@/utils/crmCacheUtils';

export const useClients = () => {
  const [clients, setClients] = useState<ClientType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showAmbassadorClients, setShowAmbassadorClients] = useState(false);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log("Appel à getAllClients pour récupérer tous les clients");
      const clientsData = await getAllClients();
      
      if (clientsData && clientsData.length > 0) {
        console.log('Clients récupérés:', clientsData.length);
        
        // ISOLATION SIMPLIFIÉE - Juste log, pas de vérification company_id pour l'instant
        const userCompanyId = await getCurrentUserCompanyId();
        console.log(`Isolation check: userCompanyId=${userCompanyId}, clients=${clientsData.length}`);
        
        // Ensure clients have updated_at property
        const formattedClients: ClientType[] = clientsData.map(client => ({
          ...client,
          company: client.company || '',
          updated_at: client.updated_at || new Date(),
          status: client.status || 'active'
        }));
        
        setClients(formattedClients);
      } else {
        console.log('Aucun client trouvé pour cette entreprise');
        setClients([]);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération des clients:", err);
      setError(err instanceof Error ? err : new Error('Erreur lors de la récupération des clients'));
      toast.error("Erreur lors du chargement des clients");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log("Chargement initial des clients");
    fetchClients();
  }, []); // Dépendances vides pour éviter les re-renders

  // Make sure filteredClients is always initialized as an array
  const filteredClients = clients ? clients.filter((client) => {
    const matchesSearch = 
      searchTerm === "" ||
      (client.name && client.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.company && client.company.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = 
      selectedStatus === "all" ||
      client.status === selectedStatus;
    
    // Filter based on ambassador clients toggle
    const matchesAmbassadorFilter = showAmbassadorClients 
      ? client.is_ambassador_client === true 
      : (client.is_ambassador_client === false || client.is_ambassador_client == null);
    
    console.log(`Client ${client.name}: is_ambassador_client=${client.is_ambassador_client}, showAmbassadorClients=${showAmbassadorClients}, matches=${matchesAmbassadorFilter}`);
    
    return matchesSearch && matchesStatus && matchesAmbassadorFilter;
  }) : [];

  console.log('Clients filtrés:', filteredClients.length);

  const refreshClients = async (force = false): Promise<void> => {
    setIsLoading(true);
    try {
      console.log("Rafraîchissement de la liste des clients...", force ? "(forcé)" : "");
      
      if (force) {
        setClients([]);
      }
      
      const refreshedClients = await getAllClients();
      console.log(`Clients rafraîchis: ${refreshedClients.length} trouvés`);
      
      setClients(refreshedClients.map(client => ({
        ...client,
        company: client.company || '',
        updated_at: client.updated_at || new Date()
      })));
    } catch (err) {
      console.error("Erreur lors du rafraîchissement des clients:", err);
      toast.error("Erreur lors du rafraîchissement des clients");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    clients: filteredClients,
    allClients: clients, // Ajouter tous les clients pour le debugging
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    selectedStatus,
    setSelectedStatus,
    showAmbassadorClients,
    setShowAmbassadorClients,
    refreshClients
  };
};
