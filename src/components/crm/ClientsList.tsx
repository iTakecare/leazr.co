
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Client } from '@/hooks/useClients';
import ClientList from '@/components/clients/ClientList';
import ClientsLoading from '@/components/clients/ClientsLoading';
import ClientsError from '@/components/clients/ClientsError';

interface ClientsListProps {
  clients: Client[];
  isLoading: boolean;
  error: Error | null;
}

const ClientsList: React.FC<ClientsListProps> = ({ clients, isLoading, error }) => {
  const navigate = useNavigate();

  const handleDeleteClient = async (id: string) => {
    // This would typically call a delete service function
    console.log(`Delete client with id: ${id}`);
    // After deletion, you might want to refresh the client list
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
    return <ClientsError error={error} />;
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
