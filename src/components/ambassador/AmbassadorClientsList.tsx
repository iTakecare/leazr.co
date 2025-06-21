
import React from "react";
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

interface AmbassadorClientsListProps {
  clients: Client[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const AmbassadorClientsList = ({ 
  clients, 
  isLoading, 
  error, 
  onRefresh 
}: AmbassadorClientsListProps) => {
  const navigate = useNavigate();

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

  const handleViewClient = (clientId: string) => {
    // TODO: Implémenter la vue détaillée du client
    toast.info("Vue détaillée du client à implémenter");
  };

  const handleEditClient = (clientId: string) => {
    // TODO: Implémenter l'édition du client
    toast.info("Édition du client à implémenter");
  };

  const handleDeleteClient = (clientId: string) => {
    // TODO: Implémenter la suppression du client
    toast.info("Suppression du client à implémenter");
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
                <TableCell>{getStatusBadge(client.status)}</TableCell>
                <TableCell>{client.phone || '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewClient(client.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClient(client.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClient(client.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
    </div>
  );
};

export default AmbassadorClientsList;
