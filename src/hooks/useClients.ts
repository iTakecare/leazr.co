
import { useState, useEffect } from 'react';
import { getAllClients } from '@/services/clientService';
import { Client } from '@/types/client';

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  companyName?: string;  // Added for compatibility with ClientSelector
  companyId?: string;    // Added for compatibility with ClientSelector
  created_at?: string | Date;
  status?: string;
  vat_number?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  address?: string;
  notes?: string;
  updated_at: Date; // Added to match the Client interface from types/client
}

export const useClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoading(true);
        const clientsData = await getAllClients();
        
        if (clientsData && clientsData.length > 0) {
          console.log('Clients récupérés:', clientsData.length);
          
          // Ensure clients have companyName, companyId, and updated_at properties
          const formattedClients: Client[] = clientsData.map(client => ({
            ...client,
            companyName: client.company || '',
            companyId: client.id,
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
  }, []);

  // Make sure filteredClients is always initialized as an array
  const filteredClients = clients ? clients.filter((client) => {
    const matchesSearch = 
      searchTerm === "" ||
      client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.company || client.companyName || '')?.toLowerCase().includes(searchTerm.toLowerCase());
    
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
    setSelectedStatus
  };
};
