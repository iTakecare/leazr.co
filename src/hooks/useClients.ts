
import { useState, useEffect } from 'react';
import { getAllClients } from '@/services/clientService';

// Define the Client interface specifically for this hook
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
        
        // Ensure clients have companyName and companyId properties
        const formattedClients: Client[] = clientsData.map(client => ({
          ...client,
          companyName: client.company || '',
          companyId: client.id
        }));
        
        setClients(formattedClients);
        setError(null);
      } catch (err) {
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
