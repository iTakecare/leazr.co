
import { useState, useEffect } from 'react';
import { Client } from '@/types/client';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
      
      // Real database query
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      setClients(data || []);
      setFilteredClients(data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('Failed to load clients');
      setLoadingError('Failed to load clients');
      toast.error("Erreur lors du chargement des clients");
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
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);
      
      if (error) throw error;
      
      // Remove client from state
      const updatedClients = clients.filter(client => client.id !== clientId);
      setClients(updatedClients);
      
      toast.success("Client supprimé avec succès");
      return true;
    } catch (err) {
      console.error('Error deleting client:', err);
      toast.error("Erreur lors de la suppression du client");
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
