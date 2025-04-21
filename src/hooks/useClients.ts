
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

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoading(true);
        setError(null); // Reset error state before fetching
        
        console.log(`Fetching clients with ambassador filter: ${showAmbassadorClients}`);
        const clientsData = await getAllClients(showAmbassadorClients);
        
        if (clientsData && clientsData.length > 0) {
          console.log('Clients récupérés:', clientsData.length);
          
          // Ensure clients have updated_at property
          const formattedClients: ClientType[] = clientsData.map(client => ({
            ...client,
            company: client.company || '',
            updated_at: client.updated_at || new Date() // Ensure updated_at exists
          }));
          
          setClients(formattedClients);
        } else {
          console.log('Aucun client trouvé');
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
    const matchesSearch = 
      searchTerm === "" ||
      client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.company || '')?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      selectedStatus === "all" ||
      client.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  }) : [];

  return {
    clients: filteredClients,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    selectedStatus,
    setSelectedStatus,
    showAmbassadorClients,
    setShowAmbassadorClients
  };
};
