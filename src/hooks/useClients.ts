import { useState, useEffect } from 'react';
import { getAllClients } from '@/services/clientService';
import type { Client as ClientType } from '@/types/client';

export const useClients = () => {
  const [clients, setClients] = useState<ClientType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showAmbassadorClients, setShowAmbassadorClients] = useState(false);
  const [totalClientsCount, setTotalClientsCount] = useState(0);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoading(true);
        setError(null); // Reset error state before fetching
        
        console.log(`Fetching clients with ambassador filter: ${showAmbassadorClients}`);
        const clientsData = await getAllClients(showAmbassadorClients);
        
        if (clientsData && Array.isArray(clientsData)) {
          console.log('Clients récupérés:', clientsData.length);
          if (clientsData.length > 0) {
            console.log('Premier client récupéré:', clientsData[0]);
          }
          
          // Ensure clients have updated_at property
          const formattedClients: ClientType[] = clientsData.map(client => ({
            ...client,
            company: client.company || '',
            updated_at: client.updated_at || new Date(), // Ensure updated_at exists
            is_ambassador_client: !!client.is_ambassador_client // Ensure boolean type
          }));
          
          // Keep track of the total count for debugging
          setTotalClientsCount(formattedClients.length);
          setClients(formattedClients);
        } else {
          console.log('Aucun client trouvé ou format de données invalide:', clientsData);
          setClients([]);
        }
      } catch (err) {
        console.error("Erreur lors de la récupération des clients:", err);
        setError(err instanceof Error ? err : new Error('Erreur lors de la récupération des clients'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, [showAmbassadorClients]);

  // Make sure filteredClients is always initialized as an array
  const filteredClients = clients ? clients.filter((client) => {
    // Check if matches search term
    const matchesSearch = 
      searchTerm === "" ||
      client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.company || '')?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Check if matches status filter
    const matchesStatus = 
      selectedStatus === "all" ||
      client.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  }) : [];

  // Search client by ID functionality
  const searchClientById = async (clientId: string) => {
    try {
      setIsLoading(true);
      // Import dynamically to avoid circular dependencies
      const { findClientById } = await import('@/services/clientService');
      const result = await findClientById(clientId);
      return result;
    } catch (error) {
      console.error("Error searching client by ID:", error);
      return {
        exists: false,
        client: null,
        isAmbassadorClient: false,
        message: "Error searching for client"
      };
    } finally {
      setIsLoading(false);
    }
  };

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
    totalClientsCount,
    searchClientById
  };
};
