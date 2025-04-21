
import { useState, useEffect } from 'react';
import { getAllClients } from '@/services/clientService';
import type { Client as ClientType } from '@/types/client';
import { toast } from 'sonner';

export const useClients = () => {
  const [clients, setClients] = useState<ClientType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showAmbassadorClients, setShowAmbassadorClients] = useState(false);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoading(true);
        setError(null); // Reset error state before fetching
        
        console.log(`Fetching clients with ambassador filter: ${showAmbassadorClients}`);
        const clientsData = await getAllClients(showAmbassadorClients);
        
        if (clientsData && clientsData.length > 0) {
          console.log('Clients récupérés:', clientsData.length);
          console.log('Premier client:', clientsData[0]);
          
          // Debug: check for the specific client
          const hasTargetClient = clientsData.some(c => c.id === '6b4393f6-88b8-44c9-a527-52dad92a95d3');
          console.log('Client spécifique présent dans les données:', hasTargetClient);
          
          // Ensure clients have updated_at property
          const formattedClients: ClientType[] = clientsData.map(client => ({
            ...client,
            company: client.company || '',
            updated_at: client.updated_at || new Date(), // Ensure updated_at exists
            status: client.status || 'active' // Ensure status exists
          }));
          
          setClients(formattedClients);
        } else {
          console.log('Aucun client trouvé');
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

    fetchClients();
  }, [showAmbassadorClients]);

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
    
    return matchesSearch && matchesStatus;
  }) : [];

  console.log('Clients filtrés:', filteredClients.length);
  
  // Debug: check if specific client passed filters
  if (clients.length > 0) {
    const targetClient = clients.find(c => c.id === '6b4393f6-88b8-44c9-a527-52dad92a95d3');
    if (targetClient) {
      const passesFilters = (
        (searchTerm === "" || 
         (targetClient.name && targetClient.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
         (targetClient.email && targetClient.email.toLowerCase().includes(searchTerm.toLowerCase())) || 
         (targetClient.company && targetClient.company.toLowerCase().includes(searchTerm.toLowerCase()))) 
        && 
        (selectedStatus === "all" || targetClient.status === selectedStatus)
      );
      console.log('Client spécifique passe les filtres:', passesFilters, {
        name: targetClient.name,
        email: targetClient.email,
        status: targetClient.status,
        searchTerm,
        selectedStatus
      });
    }
  }

  return {
    clients: filteredClients,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    selectedStatus,
    setSelectedStatus,
    showAmbassadorClients,
    setShowAmbassadorClients,
    refreshClients: async () => {
      setIsLoading(true);
      try {
        const refreshedClients = await getAllClients(showAmbassadorClients);
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
    }
  };
};
