
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Client } from '@/types/client'; // Correction: importer depuis types/client
import ClientList from '@/components/clients/ClientList';
import ClientsLoading from '@/components/clients/ClientsLoading';
import ClientsError from '@/components/clients/ClientsError';
import { deleteClient } from '@/services/clientService';
import { toast } from 'sonner';

interface ClientsListProps {
  clients: Client[];
  isLoading: boolean;
  error: Error | null;
}

const ClientsList: React.FC<ClientsListProps> = ({ clients, isLoading, error }) => {
  const navigate = useNavigate();

  const handleDeleteClient = async (id: string) => {
    try {
      await deleteClient(id);
      toast.success("Client supprimé avec succès");
      // Après la suppression, la liste sera mise à jour par le parent via useEffect
    } catch (err) {
      console.error("Erreur lors de la suppression du client:", err);
      toast.error("Erreur lors de la suppression du client");
    }
  };

  const handleEditClient = (id: string) => {
    navigate(`/clients/edit/${id}`);
  };

  const handleViewClient = (id: string) => {
    navigate(`/clients/${id}`);
  };

  if (isLoading) {
    return <ClientsLoading />;
  }

  if (error) {
    // Corriger l'erreur en passant la propriété errorMessage au lieu de error
    return <ClientsError errorMessage={error.message} onRetry={() => window.location.reload()} />;
  }

  return (
    <ClientList
      clients={clients}
      onDeleteClient={handleDeleteClient}
      onEditClient={handleEditClient}
      onViewClient={handleViewClient}
    />
  );
};

export default ClientsList;
