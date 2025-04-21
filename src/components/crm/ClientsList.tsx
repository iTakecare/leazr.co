
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Client } from '@/types/client';
import ClientList from '@/components/clients/ClientList';
import ClientsLoading from '@/components/clients/ClientsLoading';
import ClientsError from '@/components/clients/ClientsError';
import { deleteClient } from '@/services/clientService';
import { toast } from 'sonner';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ClientsListProps {
  clients: Client[];
  isLoading: boolean;
  error: Error | null;
  showAmbassadorClients: boolean;
  onToggleAmbassadorClients: (value: boolean) => void;
}

const ClientsList: React.FC<ClientsListProps> = ({ 
  clients, 
  isLoading, 
  error, 
  showAmbassadorClients,
  onToggleAmbassadorClients
}) => {
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
    return <ClientsError 
      errorMessage={error.message} 
      onRetry={() => onToggleAmbassadorClients(!showAmbassadorClients)} 
    />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start gap-4">
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
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <Info className="h-4 w-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Les clients standards sont les clients directs. Les clients des ambassadeurs sont associés à un ambassadeur et ne sont visibles qu'en activant ce commutateur.</p>
              <div className="mt-2 text-xs">
                <p>Clients affichés: {clients.length}</p>
                <p>Mode actuel: {showAmbassadorClients ? "Clients d'ambassadeurs" : "Clients standard"}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
