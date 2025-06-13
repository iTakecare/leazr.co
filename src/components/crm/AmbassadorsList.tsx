
import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeartHandshake, MoreHorizontal, Mail, Phone, AlertCircle, Loader2, RefreshCw, Plus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { getAmbassadors, Ambassador, deleteAmbassador } from "@/services/ambassadorService";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
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

interface AmbassadorsListProps {
  searchTerm?: string;
  statusFilter?: string;
}

const AmbassadorsList: React.FC<AmbassadorsListProps> = ({ searchTerm = '', statusFilter = 'all' }) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAmbassadorId, setSelectedAmbassadorId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const fetchAmbassadors = async () => {
    try {
      setLoading(true);
      const data = await getAmbassadors();
      console.log("Loaded ambassadors:", data.length, data);
      setAmbassadors(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching ambassadors:", err);
      setError("Une erreur est survenue lors du chargement des ambassadeurs");
      toast.error("Impossible de charger les ambassadeurs");
    } finally {
      setLoading(false);
    }
  };
  
  // Initial data load
  useEffect(() => {
    fetchAmbassadors();
  }, []);

  // Function to manually refresh data
  const refreshAmbassadors = async () => {
    try {
      toast.info("Actualisation de la liste des ambassadeurs...");
      await fetchAmbassadors();
      toast.success("Données des ambassadeurs rafraîchies");
    } catch (err) {
      console.error("Error refreshing ambassadors:", err);
      setError("Erreur lors du rafraîchissement des données");
      toast.error("Impossible de rafraîchir les données");
    }
  };

  const handleDeleteAmbassador = async () => {
    if (!selectedAmbassadorId) return;
    
    try {
      setDeleteLoading(true);
      await deleteAmbassador(selectedAmbassadorId);
      toast.success("Ambassadeur supprimé avec succès");
      
      // Refresh the list after successful deletion
      await fetchAmbassadors();
      
    } catch (error) {
      console.error("Error deleting ambassador:", error);
      toast.error("Erreur lors de la suppression de l'ambassadeur");
    } finally {
      setDeleteLoading(false);
      setShowDeleteDialog(false);
      setSelectedAmbassadorId(null);
    }
  };

  const openDeleteDialog = (ambassadorId: string) => {
    setSelectedAmbassadorId(ambassadorId);
    setShowDeleteDialog(true);
  };

  const filteredAmbassadors = ambassadors.filter(ambassador => {
    const matchesSearch = 
      ambassador.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ambassador.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ambassador.company && ambassador.company.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || ambassador.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Chargement des ambassadeurs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={refreshAmbassadors} className="mt-4">
          Réessayer
        </Button>
      </div>
    );
  }

  if (ambassadors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-gray-300 mb-4" />
        <p className="text-muted-foreground">Aucun ambassadeur n'a été trouvé</p>
        <Button variant="outline" onClick={refreshAmbassadors} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Rafraîchir
        </Button>
      </div>
    );
  }
  
  const renderMobileView = () => {
    return (
      <div className="space-y-4">
        {filteredAmbassadors.length > 0 ? (
          filteredAmbassadors.map((ambassador) => (
            <div key={ambassador.id} className="bg-card rounded-lg shadow p-4 border">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{ambassador.name}</h3>
                  <div className="text-xs text-muted-foreground mt-1 break-all">
                    <div className="flex items-center">
                      <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{ambassador.email}</span>
                    </div>
                    {ambassador.phone && (
                      <div className="flex items-center mt-1">
                        <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                        {ambassador.phone}
                      </div>
                    )}
                  </div>
                </div>
                <Badge variant={ambassador.status === 'active' ? 'default' : 'secondary'} className={
                  ambassador.status === 'active' 
                    ? "bg-green-100 text-green-800 hover:bg-green-100" 
                    : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                }>
                  {ambassador.status === 'active' ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">Entreprise</span>
                  {ambassador.company || "-"}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Clients</span>
                  {ambassador.clients_count || 0}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Commissions</span>
                  {ambassador.commissions_total || 0}€
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <span className="sr-only">Actions</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to={`/ambassadors/${ambassador.id}`}>Afficher le profil</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={`/ambassadors/edit/${ambassador.id}`}>Modifier</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={`/ambassadors/${ambassador.id}/clients`}>Voir les clients</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={refreshAmbassadors}>
                      Rafraîchir les données
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className={ambassador.status === 'active' ? "text-amber-600" : "text-green-600"}>
                      {ambassador.status === 'active' ? 'Désactiver' : 'Activer'}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => openDeleteDialog(ambassador.id)}
                    >
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="h-12 w-12 mb-2 text-gray-300" />
            <p className="text-muted-foreground">Aucun ambassadeur trouvé</p>
          </div>
        )}
      </div>
    );
  };

  const renderDesktopView = () => {
    return (
      <div className="space-y-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Nom</TableHead>
              <TableHead className="whitespace-nowrap">Contact</TableHead>
              <TableHead className="whitespace-nowrap">Entreprise</TableHead>
              <TableHead className="whitespace-nowrap">Clients</TableHead>
              <TableHead className="whitespace-nowrap">Commissions</TableHead>
              <TableHead className="whitespace-nowrap">Statut</TableHead>
              <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAmbassadors.length > 0 ? (
              filteredAmbassadors.map((ambassador) => (
                <TableRow key={ambassador.id}>
                  <TableCell className="font-medium">{ambassador.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate max-w-[150px]">{ambassador.email}</span>
                      </div>
                      {ambassador.phone && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                          {ambassador.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{ambassador.company || "-"}</TableCell>
                  <TableCell>{ambassador.clients_count || 0} clients</TableCell>
                  <TableCell>{ambassador.commissions_total || 0} €</TableCell>
                  <TableCell>
                    <Badge variant={ambassador.status === 'active' ? 'default' : 'secondary'} className={
                      ambassador.status === 'active' 
                        ? "bg-green-100 text-green-800 hover:bg-green-100" 
                        : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                    }>
                      {ambassador.status === 'active' ? 'Actif' : 'Inactif'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to={`/ambassadors/${ambassador.id}`}>Afficher le profil</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/ambassadors/edit/${ambassador.id}`}>Modifier</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/ambassadors/${ambassador.id}/clients`}>Voir les clients</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={refreshAmbassadors}>
                          Rafraîchir les données
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className={ambassador.status === 'active' ? "text-amber-600" : "text-green-600"}>
                          {ambassador.status === 'active' ? 'Désactiver' : 'Activer'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => openDeleteDialog(ambassador.id)}
                        >
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mb-2 text-gray-300" />
                    <p>Aucun ambassadeur trouvé</p>
                    <Button variant="outline" onClick={refreshAmbassadors} className="mt-4">
                      Rafraîchir les données
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between mb-4">
        <Button onClick={() => navigate('/ambassadors/create')} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvel ambassadeur
        </Button>
        <Button variant="outline" size="sm" onClick={refreshAmbassadors}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser la liste
        </Button>
      </div>
      {isMobile ? renderMobileView() : renderDesktopView()}
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cet ambassadeur ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDeleteAmbassador();
              }}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                "Supprimer"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AmbassadorsList;
