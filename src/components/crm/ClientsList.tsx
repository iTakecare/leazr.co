import React from 'react';
import { useRoleNavigation } from '@/hooks/useRoleNavigation';
import { Client } from '@/types/client';
import ClientList from '@/components/clients/ClientList';
import ClientsLoading from '@/components/clients/ClientsLoading';
import ClientsError from '@/components/clients/ClientsError';
import { deleteClient, syncClientUserAccountStatus } from '@/services/clientService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserX2, Database, Copy } from "lucide-react";

interface ClientsListProps {
  clients: Client[];
  isLoading: boolean;
  error: Error | null;
  showAmbassadorClients: boolean;
  onToggleAmbassadorClients: (value: boolean) => void;
  refreshClients?: () => Promise<void>;
  allClients?: Client[]; // Pour le debugging
}

const ClientsList: React.FC<ClientsListProps> = ({ 
  clients, 
  isLoading, 
  error, 
  showAmbassadorClients,
  onToggleAmbassadorClients,
  refreshClients,
  allClients
}) => {
  const { navigateToAdmin } = useRoleNavigation();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [showDuplicates, setShowDuplicates] = React.useState(false);
  const [debugView, setDebugView] = React.useState(false);

  const handleDeleteClient = async (id: string) => {
    try {
      console.log(`Tentative de suppression du client: ${id}`);
      
      // Récupérer d'abord les informations du client pour vérifier s'il a un compte utilisateur
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('user_id, name, email')
        .eq('id', id)
        .single();
        
      if (clientError) {
        console.error("Erreur lors de la récupération du client:", clientError);
        throw new Error("Impossible de récupérer les informations du client");
      }
      
      // Si le client a un compte utilisateur, essayer de le supprimer
      if (clientData.user_id) {
        console.log(`Le client ${clientData.name} a un compte utilisateur (${clientData.user_id}), suppression du compte...`);
        
        try {
          const { error: userDeleteError } = await supabase.functions.invoke('delete-user', {
            body: { user_id: clientData.user_id }
          });
          
          if (userDeleteError) {
            console.error("Erreur lors de la suppression du compte utilisateur:", userDeleteError);
            console.log("Continuing with client deletion despite user deletion error");
          } else {
            console.log("Compte utilisateur supprimé avec succès");
          }
        } catch (functionError) {
          console.error("Erreur lors de l'appel de la fonction delete-user:", functionError);
          console.log("Continuing with client deletion despite function error");
        }
      }
      
      // Maintenant supprimer le client
      await deleteClient(id);
      toast.success("Client supprimé avec succès");
      
      if (refreshClients) {
        await refreshClients();
      }
    } catch (err) {
      console.error("Erreur lors de la suppression du client:", err);
      toast.error(`Erreur lors de la suppression du client: ${err.message || 'Erreur inconnue'}`);
    }
  };

  const handleEditClient = (id: string) => {
    navigateToAdmin(`clients/${id}?edit=true`);
  };

  const handleViewClient = (id: string) => {
    navigateToAdmin(`clients/${id}`);
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
  
  const toggleDuplicates = () => {
    setShowDuplicates(!showDuplicates);
  };
  
  const toggleDebugView = () => {
    setDebugView(!debugView);
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

  // Séparer les clients normaux et les clients en double pour le débogage
  const duplicateClients = allClients?.filter(c => c.status === 'duplicate') || [];
  const regularClients = allClients?.filter(c => c.status !== 'duplicate') || [];
  
  // Vérifier si le client spécifique existe
  const targetClient = allClients?.find(c => c.id === '6b4393f6-88b8-44c9-a527-52dad92a95d3');
  
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
        
        <Button 
          variant="outline" 
          onClick={() => navigateToAdmin('clients/duplicates')}
        >
          <Copy className="h-4 w-4 mr-2" />
          Gérer les doublons
        </Button>
      </div>
      
      {debugView && (
        <div className="p-4 bg-slate-100 rounded-md mb-4">
          <h3 className="font-bold mb-2">Informations de débogage</h3>
          <div className="space-y-2">
            <p><strong>Nombre total de clients dans la DB:</strong> {allClients?.length || 0}</p>
            <p><strong>Nombre de clients normaux:</strong> {regularClients.length}</p>
            <p><strong>Nombre de clients en double:</strong> {duplicateClients.length}</p>
            <p><strong>Nombre de clients affichés:</strong> {clients.length}</p>
            <p><strong>Mode:</strong> {showAmbassadorClients ? "Clients ambassadeurs" : "Clients standard"}</p>
            
            {targetClient ? (
              <div className="bg-green-100 p-2 rounded-md mt-2">
                <p><strong>Client spécifique trouvé!</strong></p>
                <pre className="text-xs overflow-auto max-h-32">
                  {JSON.stringify(targetClient, null, 2)}
                </pre>
                <p className="mt-2"><strong>Affiché dans la liste:</strong> {clients.some(c => c.id === targetClient.id) ? "Oui" : "Non"}</p>
              </div>
            ) : (
              <div className="bg-red-100 p-2 rounded-md mt-2">
                <p><strong>Client spécifique introuvable!</strong> (ID: 6b4393f6-88b8-44c9-a527-52dad92a95d3)</p>
              </div>
            )}
            
            <div className="flex space-x-2 mt-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={toggleDuplicates}
                className="bg-amber-50"
              >
                <UserX2 className="h-4 w-4 mr-1" />
                {showDuplicates ? "Masquer doublons" : "Afficher doublons"}
              </Button>
            </div>
            
            {showDuplicates && duplicateClients.length > 0 && (
              <div className="mt-2">
                <h4 className="font-medium">Clients en double:</h4>
                <ul className="list-disc pl-5 mt-1">
                  {duplicateClients.map(client => (
                    <li key={client.id}>{client.name} ({client.email}) - ID: {client.id}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
      
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
