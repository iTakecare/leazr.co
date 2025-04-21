
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Client } from '@/types/client';
import ClientList from '@/components/clients/ClientList';
import ClientsLoading from '@/components/clients/ClientsLoading';
import ClientsError from '@/components/clients/ClientsError';
import { deleteClient, syncClientUserAccountStatus } from '@/services/clientService';
import { toast } from 'sonner';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

interface ClientsListProps {
  clients: Client[];
  isLoading: boolean;
  error: Error | null;
  showAmbassadorClients: boolean;
  onToggleAmbassadorClients: (value: boolean) => void;
  refreshClients?: () => Promise<void>;
}

const ClientsList: React.FC<ClientsListProps> = ({ 
  clients, 
  isLoading, 
  error, 
  showAmbassadorClients,
  onToggleAmbassadorClients,
  refreshClients
}) => {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleDeleteClient = async (id: string) => {
    try {
      await deleteClient(id);
      toast.success("Client supprimé avec succès");
      if (refreshClients) {
        await refreshClients();
      }
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

  const handleRefresh = async () => {
    if (!refreshClients) return;
    
    setIsRefreshing(true);
    try {
      await refreshClients();
      toast.success("Liste des clients actualisée");
    } catch (err) {
      console.error("Erreur lors de l'actualisation des clients:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSyncClientAccounts = async () => {
    setIsRefreshing(true);
    try {
      // Synchroniser le statut du compte utilisateur pour chaque client
      for (const client of clients) {
        if (client.id) {
          await syncClientUserAccountStatus(client.id);
        }
      }
      
      if (refreshClients) {
        await refreshClients();
      }
      
      toast.success("Statuts des comptes clients synchronisés");
    } catch (err) {
      console.error("Erreur lors de la synchronisation des comptes:", err);
      toast.error("Erreur lors de la synchronisation des comptes");
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return <ClientsLoading />;
  }

  if (error) {
    return <ClientsError 
      errorMessage={error.message} 
      onRetry={() => {
        if (refreshClients) refreshClients();
      }} 
    />;
  }

  console.log('ClientsList rendering with', clients.length, 'clients');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Switch 
            id="show-ambassador-clients" 
            checked={showAmbassadorClients}
            onCheckedChange={onToggleAmbassadorClients}
          />
          <Label htmlFor="show-ambassador-clients">
            {showAmbassadorClients ? "Afficher les clients standard" : "Afficher les clients des ambassadeurs"}
          </Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={isRefreshing || !refreshClients}
          >
            <RefreshCcw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncClientAccounts}
            disabled={isRefreshing}
          >
            Synchroniser les comptes
          </Button>
        </div>
      </div>
      
      <ClientList
        clients={clients}
        onDeleteClient={handleDeleteClient}
        onEditClient={handleEditClient}
        onViewClient={handleViewClient}
      />
    </div>
  );
};

export default ClientsList;
