
import React, { useState } from "react";
import { Client } from "@/types/client";
import { Button } from "@/components/ui/button";
import { Trash2, Edit, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import AmbassadorClientDetailDialog from "./AmbassadorClientDetailDialog";
import AmbassadorClientEditDialog from "./AmbassadorClientEditDialog";

interface AmbassadorClientsListProps {
  clients: Client[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onDeleteClient?: (clientId: string) => Promise<void>;
}

const AmbassadorClientsList = ({ 
  clients, 
  isLoading, 
  error, 
  onRefresh,
  onDeleteClient
}: AmbassadorClientsListProps) => {
  const navigate = useNavigate();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Chargement des clients...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="text-destructive text-center">
          <p className="font-medium">Erreur lors du chargement</p>
          <p className="text-sm">{error}</p>
        </div>
        <Button onClick={onRefresh} variant="outline">
          Réessayer
        </Button>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="text-muted-foreground text-center">
          <p className="font-medium">Aucun client trouvé</p>
          <p className="text-sm">Vous n'avez pas encore de clients associés</p>
        </div>
        <Button onClick={() => navigate("/ambassador/clients/create")}>
          Créer votre premier client
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Actif</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactif</Badge>;
      case 'lead':
        return <Badge variant="outline">Prospect</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleViewClient = (client: Client) => {
    setSelectedClient(client);
    setShowDetailDialog(true);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setShowEditDialog(true);
  };

  const handleDeleteClick = (client: Client) => {
    setClientToDelete(client);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete || !onDeleteClient) return;

    setIsDeleting(true);
    try {
      await onDeleteClient(clientToDelete.id);
      setShowDeleteDialog(false);
      setClientToDelete(null);
      onRefresh();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClientUpdated = (updatedClient: Client) => {
    toast.success("Client mis à jour avec succès");
    onRefresh();
  };

  const handleEditFromDetail = () => {
    setShowDetailDialog(false);
    setShowEditDialog(true);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Société</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell>{client.email || '-'}</TableCell>
                <TableCell>{client.company || '-'}</TableCell>
                <TableCell>{getStatusBadge(client.status || 'active')}</TableCell>
                <TableCell>{client.phone || '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewClient(client)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClient(client)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {onDeleteClient && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(client)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <div className="text-sm text-muted-foreground">
        Total : {clients.length} client{clients.length > 1 ? 's' : ''}
      </div>

      {/* Dialog de détail */}
      <AmbassadorClientDetailDialog
        client={selectedClient}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        onEdit={handleEditFromDetail}
      />

      {/* Dialog d'édition */}
      <AmbassadorClientEditDialog
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
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AmbassadorClientsList;
