import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Client } from "@/types/client";
import { useAuth } from "@/context/AuthContext";
import { getAllClients, deleteClient as deleteClientService } from "@/services/clientService";
import { Plus, Search, Edit, Trash2, Phone, Mail, Building } from "lucide-react";
import { toast } from "sonner";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import PartnerClientEditDialog from "./PartnerClientEditDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PartnerClientsListProps {
  searchTerm?: string;
}

const PartnerClientsList = ({ searchTerm: externalSearchTerm }: PartnerClientsListProps) => {
  const { user } = useAuth();
  const { navigateToPartner } = useRoleNavigation();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(externalSearchTerm || "");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setIsLoading(true);
      const data = await getAllClients();
      // For partners, we might want to filter to only their clients
      // This would require additional logic based on partner-client relationships
      setClients(data);
    } catch (error) {
      console.error("Error loading clients:", error);
      toast.error("Erreur lors du chargement des clients");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setShowEditDialog(true);
  };

  const handleClientUpdated = (updatedClient: Client) => {
    setClients(prev => prev.map(client => 
      client.id === updatedClient.id ? updatedClient : client
    ));
    setShowEditDialog(false);
    setSelectedClient(null);
  };

  const handleDeleteClick = (client: Client) => {
    setClientToDelete(client);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;

    try {
      await deleteClientService(clientToDelete.id);
      setClients(prev => prev.filter(client => client.id !== clientToDelete.id));
      toast.success("Client supprimé avec succès");
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error("Erreur lors de la suppression du client");
    } finally {
      setShowDeleteDialog(false);
      setClientToDelete(null);
    }
  };

  const filteredClients = clients.filter(client => {
    const term = searchTerm.toLowerCase();
    return (
      client.name.toLowerCase().includes(term) ||
      client.email?.toLowerCase().includes(term) ||
      client.company?.toLowerCase().includes(term)
    );
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "inactive":
        return "secondary";
      case "lead":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Actif";
      case "inactive":
        return "Inactif";
      case "lead":
        return "Prospect";
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="text-muted-foreground">Chargement des clients...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Rechercher un client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => navigateToPartner("clients/create")}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau client
        </Button>
      </div>

      {filteredClients.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              {searchTerm ? "Aucun client trouvé pour cette recherche." : "Aucun client enregistré."}
            </p>
            {!searchTerm && (
              <Button 
                className="mt-4" 
                onClick={() => navigateToPartner("clients/create")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer le premier client
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{client.name}</CardTitle>
                    {client.company && (
                      <p className="text-sm text-muted-foreground flex items-center mt-1">
                        <Building className="h-3 w-3 mr-1" />
                        {client.company}
                      </p>
                    )}
                  </div>
                  <Badge variant={getStatusBadgeVariant(client.status)}>
                    {getStatusLabel(client.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {client.email && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="h-3 w-3 mr-2" />
                    {client.email}
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="h-3 w-3 mr-2" />
                    {client.phone}
                  </div>
                )}
                {(client.city || client.country) && (
                  <div className="text-sm text-muted-foreground">
                    {[client.city, client.country].filter(Boolean).join(", ")}
                  </div>
                )}
                
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(client)}
                    className="flex-1"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Modifier
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteClick(client)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog d'édition */}
      <PartnerClientEditDialog
        client={selectedClient}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onClientUpdated={handleClientUpdated}
      />

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le client "{clientToDelete?.name}" ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PartnerClientsList;