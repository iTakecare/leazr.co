
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface ClientSelectorClient {
  id: string;
  name: string;
  email?: string;
  company?: string;
}

interface ClientSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectClient: (client: ClientSelectorClient) => void;
  selectedClientId?: string;
  onClientSelect: () => void;
  ambassadorMode?: boolean;
}

const ClientSelector: React.FC<ClientSelectorProps> = ({
  isOpen,
  onClose,
  onSelectClient,
  selectedClientId,
  onClientSelect,
  ambassadorMode = false
}) => {
  const { user, isAdmin, ambassadorId } = useAuth();
  const [clients, setClients] = useState<ClientSelectorClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isAdminUser = isAdmin;
  const shouldFilterByAmbassador = ambassadorMode && !isAdminUser;

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);

      let clientsData;

      if (shouldFilterByAmbassador && user?.id) {
        // Mode ambassadeur : utiliser la fonction sécurisée
        const { data, error } = await supabase.rpc('get_ambassador_clients_secure', { 
          p_user_id: user.id 
        });

        if (error) throw error;

        clientsData = data?.map((item: any) => ({
          id: item.client_id,
          name: item.client_name,
          email: item.client_email,
          company: item.client_company
        })) || [];
      } else {
        // Mode admin ou normal : requête directe
        const { data, error } = await supabase
          .from("clients")
          .select("id, name, email, company")
          .eq("status", "active")
          .order("name");

        if (error) throw error;
        clientsData = data || [];
      }

      setClients(clientsData);
    } catch (error: any) {
      console.error("Erreur lors du chargement des clients:", error);
      setError(error.message || "Erreur lors du chargement des clients");
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchClients();
    }
  }, [isOpen, shouldFilterByAmbassador, user?.id]);

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (client.company && client.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleClientSelect = (client: ClientSelectorClient) => {
    onSelectClient(client);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Sélectionner un client</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Rechercher un client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {isAdminUser && (
            <Button variant="outline" onClick={() => console.log("Ajouter client")}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto mt-4 space-y-2">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Chargement des clients...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500">{error}</p>
              <Button variant="outline" onClick={fetchClients} className="mt-2">
                Réessayer
              </Button>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8">
              <User className="mx-auto h-12 w-12 text-gray-300" />
              <p className="text-gray-500 mt-2">
                {searchTerm ? "Aucun client trouvé" : "Aucun client disponible"}
              </p>
            </div>
          ) : (
            filteredClients.map((client) => (
              <div
                key={client.id}
                className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedClientId === client.id ? "border-primary bg-primary/5" : "border-gray-200"
                }`}
                onClick={() => handleClientSelect(client)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{client.name}</h3>
                    {client.email && (
                      <p className="text-sm text-gray-500">{client.email}</p>
                    )}
                    {client.company && (
                      <p className="text-sm text-gray-500">{client.company}</p>
                    )}
                  </div>
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientSelector;
