
import { useState, useEffect } from 'react';
import { Client } from '@/types/client';

// This is a mock hook that simulates fetching clients from an API
export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState('');

  const fetchClients = async () => {
    try {
      setLoading(true);
      setIsLoading(true);
      setError(null);
      setLoadingError('');
      
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock client data
      const mockClients: Client[] = [
        {
          id: '1',
          name: 'Clinique Saint-Jean',
          email: 'contact@clinique-saintjean.fr',
          phone: '+33 1 23 45 67 89',
          status: 'active',
          company: 'Groupe Hospitalier Privé',
          address: '15 Avenue des Soins',
          city: 'Paris',
          postal_code: '75008',
          country: 'France',
          created_at: '2023-01-15T10:30:00.000Z',
          updated_at: '2023-05-20T14:45:00.000Z',
          ambassador_id: '1'
        },
        {
          id: '2',
          name: 'Cabinet Médical Durand',
          email: 'secretariat@cabinet-durand.fr',
          status: 'active',
          created_at: '2023-02-08T09:15:00.000Z',
          updated_at: '2023-04-10T11:20:00.000Z',
          ambassador_id: '2'
        }
      ];
      
      setClients(mockClients as Client[]);
      setFilteredClients(mockClients as Client[]);
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('Failed to load clients');
      setLoadingError('Failed to load clients');
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (clients.length > 0) {
      const filtered = clients.filter(client => {
        const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                             (client.company && client.company.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
        
        return matchesSearch && matchesStatus;
      });
      
      setFilteredClients(filtered);
    }
  }, [clients, searchTerm, statusFilter]);

  const handleDeleteClient = async (clientId: string) => {
    // This would normally call an API to delete the client
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Remove client from state
      const updatedClients = clients.filter(client => client.id !== clientId);
      setClients(updatedClients);
      return true;
    } catch (err) {
      console.error('Error deleting client:', err);
      return false;
    }
  };

  return { 
    clients, 
    filteredClients,
    loading,
    loadingError,
    isLoading,
    error,
    searchTerm, 
    setSearchTerm,
    statusFilter, 
    setStatusFilter,
    fetchClients,
    handleDeleteClient
  };
}
