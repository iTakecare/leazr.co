import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { deleteClient } from "@/services/clientService";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const ClientsPage = () => {
  const navigate = useNavigate();
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null);

  const {
    clients,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    selectedStatus,
    setSelectedStatus
  } = useClients();

  const handleDeleteClient = async () => {
    if (deleteClientId) {
      try {
        await deleteClient(deleteClientId);
        toast.success("Client supprimé avec succès");
      } catch (error) {
        console.error("Error deleting client:", error);
        toast.error("Erreur lors de la suppression du client");
      } finally {
        setDeleteClientId(null);
      }
    }
  };

  return (
    <PageTransition>
      <Container>
        <div className="container py-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Clients</h1>
            <Link to="/clients/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un client
              </Button>
            </Link>
          </div>

          <div className="flex items-center space-x-4 mb-4">
            <Input
              type="text"
              placeholder="Rechercher un client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="inactive">Inactif</SelectItem>
                <SelectItem value="lead">Prospect</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chargement...
            </div>
          ) : error ? (
            <div className="text-red-500">Erreur: {error.message}</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Société</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>{client.name}</TableCell>
                      <TableCell>{client.email}</TableCell>
                      <TableCell>{client.company || '-'}</TableCell>
                      <TableCell>{client.status}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/clients/${client.id}`)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Modifier
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteClientId(client.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Supprimer
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible. Voulez-vous vraiment supprimer ce client ?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDeleteClient}>Supprimer</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Container>
    </PageTransition>
  );
};

export default ClientsPage;
