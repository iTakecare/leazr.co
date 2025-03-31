
import { useState, useEffect } from 'react';
import { getAllClients } from '@/services/clientService';
import type { Client as ClientType } from '@/types/client';

// Nous n'avons plus besoin de cette interface car nous utilisons celle de types/client
// Interface supprimée pour éviter le conflit

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
        
        setError(null);
      } catch (err) {
        console.error("Erreur lors de la récupération des clients:", err);
        setError(err instanceof Error ? err : new Error('Failed to fetch clients'));
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
