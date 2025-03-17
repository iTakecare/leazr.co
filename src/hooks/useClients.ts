
import { useState, useEffect } from 'react';
import { Client } from '@/types/client';

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true); // Alias for loading
  const [loadingError, setLoadingError] = useState('');
  const [error, setError] = useState<string | null>(null); // Alias for loadingError
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  useEffect(() => {
    fetchClients();
  }, []);
  
  const fetchClients = async () => {
    try {
      setLoading(true);
      setIsLoading(true);
      setLoadingError('');
      setError(null);
      
      // Here we would fetch clients from the API
      // For now, we'll use mock data
      const mockClients = [
        {
          id: '1',
          name: 'Acme Corporation',
          email: 'contact@acme.com',
          phone: '+33 1 23 45 67 89',
          status: 'active',
          created_at: '2023-01-15',
          ambassador_id: null
        },
        {
          id: '2',
          name: 'TechStart SAS',
          email: 'info@techstart.fr',
          phone: '+33 6 12 34 56 78',
          status: 'active',
          created_at: '2023-02-20',
          ambassador_id: '1'
        },
        {
          id: '3',
          name: 'Digital Marketing Agency',
          email: 'hello@dma.fr',
          status: 'inactive',
          created_at: '2023-03-05',
          ambassador_id: '1'
        }
      ];
      
      setClients(mockClients);
      setFilteredClients(mockClients);
    } catch (err) {
      console.error('Error fetching clients:', err);
      setLoadingError('Failed to load clients');
      setError('Failed to load clients');
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };
  
  const handleDeleteClient = async (clientId: string) => {
    try {
      // Here we would call the API to delete the client
      // For now, we'll just update our local state
      setClients(clients.filter(client => client.id !== clientId));
      setFilteredClients(filteredClients.filter(client => client.id !== clientId));
      return true;
    } catch (err) {
      console.error('Error deleting client:', err);
      return false;
    }
  };
  
  // Update filteredClients whenever search term or status filter changes
  useEffect(() => {
    const filtered = clients.filter(client => {
      const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
    
    setFilteredClients(filtered);
  }, [clients, searchTerm, statusFilter]);
  
  return {
    clients,
    filteredClients,
    loading,
    isLoading, // Alias for loading
    loadingError,
    error, // Alias for loadingError
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    fetchClients,
    handleDeleteClient
  };
}
