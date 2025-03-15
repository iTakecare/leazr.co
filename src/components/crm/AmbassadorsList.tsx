
import React, { useState, useCallback, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeartHandshake, MoreHorizontal, Mail, Phone, ReceiptEuro, AlertCircle, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/utils/formatters";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AmbassadorModal from './modals/AmbassadorModal';
import ClientsView from './detail/ClientsView';
import CommissionsView from './detail/CommissionsView';
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
import { AmbassadorFormValues } from './forms/AmbassadorForm';
import { getAmbassadors, createAmbassador, updateAmbassador, deleteAmbassador, getAmbassadorCommissions, getAmbassadorClients, Ambassador } from '@/services/ambassadorService';

interface AmbassadorWithClients extends Ambassador {
  clients: any[];
}

interface AmbassadorWithCommissions extends Ambassador {
  commissions: any[];
}

const AmbassadorsList = () => {
  const navigate = useNavigate();
  const [ambassadorsList, setAmbassadorsList] = useState<Ambassador[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentAmbassador, setCurrentAmbassador] = useState<Ambassador | null>(null);
  const [isClientsViewOpen, setIsClientsViewOpen] = useState(false);
  const [isCommissionsViewOpen, setIsCommissionsViewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentAmbassadorWithClients, setCurrentAmbassadorWithClients] = useState<AmbassadorWithClients | null>(null);
  const [currentAmbassadorWithCommissions, setCurrentAmbassadorWithCommissions] = useState<AmbassadorWithCommissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch ambassadors on component mount
  useEffect(() => {
    fetchAmbassadors();
  }, []);

  const fetchAmbassadors = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAmbassadors();
      setAmbassadorsList(data);
    } catch (err) {
      console.error("Error fetching ambassadors:", err);
      setError("Erreur lors du chargement des ambassadeurs");
      toast.error("Erreur lors du chargement des ambassadeurs");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAmbassador = () => {
    setCurrentAmbassador(null);
    setIsAddModalOpen(true);
  };

  const handleEditAmbassador = (id: string) => {
    const ambassador = ambassadorsList.find(a => a.id === id);
    if (ambassador) {
      setCurrentAmbassador({...ambassador});
      setIsEditModalOpen(true);
    }
  };

  const handleViewProfile = (id: string) => {
    navigate(`/ambassadors/${id}`);
  };

  const handleViewClients = async (id: string) => {
    try {
      const ambassador = ambassadorsList.find(a => a.id === id);
      if (!ambassador) {
        toast.error("Ambassadeur introuvable");
        return;
      }
      
      const clients = await getAmbassadorClients(id);
      setCurrentAmbassadorWithClients({
        ...ambassador,
        clients: clients
      });
      setIsClientsViewOpen(true);
    } catch (err) {
      console.error("Error fetching ambassador clients:", err);
      toast.error("Erreur lors du chargement des clients de l'ambassadeur");
    }
  };

  const handleViewCommissions = async (id: string) => {
    try {
      const ambassador = ambassadorsList.find(a => a.id === id);
      if (!ambassador) {
        toast.error("Ambassadeur introuvable");
        return;
      }

      const commissions = await getAmbassadorCommissions(id);
      setCurrentAmbassadorWithCommissions({
        ...ambassador,
        commissions: commissions
      });
      setIsCommissionsViewOpen(true);
    } catch (err) {
      console.error("Error fetching ambassador commissions:", err);
      toast.error("Erreur lors du chargement des commissions de l'ambassadeur");
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const ambassador = ambassadorsList.find(a => a.id === id);
      if (!ambassador) {
        toast.error("Ambassadeur introuvable");
        return;
      }
      
      const newStatus = ambassador.status === 'active' ? 'inactive' : 'active';
      
      // Créer un objet qui correspond au type PartialAmbassadorFormValues avec le status
      const updateData: Partial<AmbassadorFormValues> = { 
        status: newStatus as 'active' | 'inactive'
      };
      
      await updateAmbassador(id, updateData);
      
      setAmbassadorsList(prevList => 
        prevList.map(a => 
          a.id === id 
            ? { ...a, status: newStatus } 
            : a
        )
      );
      
      toast.success(`Le statut de l'ambassadeur ${ambassador?.name} a été changé en "${newStatus === 'active' ? 'Actif' : 'Inactif'}"`);
    } catch (err) {
      console.error("Error updating ambassador status:", err);
      toast.error("Erreur lors de la mise à jour du statut de l'ambassadeur");
    }
  };

  const handleDeleteAmbassador = (id: string) => {
    const ambassador = ambassadorsList.find(a => a.id === id);
    if (ambassador) {
      setCurrentAmbassador({...ambassador});
      setIsDeleteDialogOpen(true);
    }
  };

  const confirmDelete = useCallback(async () => {
    if (!currentAmbassador) return;
    
    try {
      const ambassadorToDelete = {...currentAmbassador};
      
      // First, reset all states to prevent any stuck references
      setCurrentAmbassador(null);
      setCurrentAmbassadorWithClients(null);
      setCurrentAmbassadorWithCommissions(null);
      
      // Close all dialogs/modals
      setIsDeleteDialogOpen(false);
      setIsEditModalOpen(false);
      setIsClientsViewOpen(false);
      setIsCommissionsViewOpen(false);
      
      // Delete from database
      await deleteAmbassador(ambassadorToDelete.id);
      
      // Then update the list
      setAmbassadorsList(prevList => prevList.filter(a => a.id !== ambassadorToDelete.id));
      
      // Show success notification
      toast.success(`L'ambassadeur ${ambassadorToDelete.name} a été supprimé`);
      console.log("Ambassadeur supprimé avec succès:", ambassadorToDelete.id);
      
    } catch (error) {
      console.error("Erreur lors de la suppression de l'ambassadeur:", error);
      toast.error("Une erreur est survenue lors de la suppression de l'ambassadeur");
      
      // Make sure dialogs are closed even on error
      setIsDeleteDialogOpen(false);
    }
  }, [currentAmbassador]);

  const handleSaveAmbassador = async (data: AmbassadorFormValues) => {
    setIsSubmitting(true);
    
    try {
      if (currentAmbassador?.id) {
        // Update existing ambassador
        await updateAmbassador(currentAmbassador.id, data);
        
        setAmbassadorsList(prevList => 
          prevList.map(ambassador => 
            ambassador.id === currentAmbassador.id
              ? { 
                  ...ambassador, 
                  name: data.name,
                  email: data.email,
                  phone: data.phone || "",
                  region: data.region,
                  notes: data.notes
                }
              : ambassador
          )
        );
        toast.success(`L'ambassadeur ${data.name} a été mis à jour`);
        setIsEditModalOpen(false);
      } else {
        // Create new ambassador
        const newAmbassador = await createAmbassador(data);
        
        if (newAmbassador) {
          setAmbassadorsList(prevList => [...prevList, newAmbassador]);
          toast.success(`L'ambassadeur ${data.name} a été ajouté`);
          setIsAddModalOpen(false);
        }
      }
    } catch (err) {
      console.error("Error saving ambassador:", err);
      toast.error("Erreur lors de l'enregistrement de l'ambassadeur");
    } finally {
      setIsSubmitting(false);
      setCurrentAmbassador(null);
    }
  };

  const closeAllModals = useCallback(() => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setIsClientsViewOpen(false);
    setIsCommissionsViewOpen(false);
    setIsDeleteDialogOpen(false);
    setCurrentAmbassador(null);
    setCurrentAmbassadorWithClients(null);
    setCurrentAmbassadorWithCommissions(null);
  }, []);

  // Fonction pour convertir un Ambassador en AmbassadorFormValues pour le formulaire
  const convertAmbassadorToFormValues = (ambassador: Ambassador): AmbassadorFormValues => {
    return {
      name: ambassador.name,
      email: ambassador.email,
      phone: ambassador.phone,
      region: ambassador.region,
      status: ambassador.status as "active" | "inactive",
      notes: ambassador.notes
    };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Chargement des ambassadeurs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchAmbassadors}>Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleAddAmbassador} className="gap-2">
          <HeartHandshake className="h-4 w-4" />
          Ajouter un ambassadeur
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Région</TableHead>
            <TableHead>Clients</TableHead>
            <TableHead>Commissions</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ambassadorsList.length > 0 ? (
            ambassadorsList.map((ambassador) => (
              <TableRow key={ambassador.id} className="cursor-pointer" onClick={() => handleViewProfile(ambassador.id)}>
                <TableCell className="font-medium">{ambassador.name}</TableCell>
                <TableCell>
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Mail className="h-3 w-3 mr-1" />
                      {ambassador.email}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Phone className="h-3 w-3 mr-1" />
                      {ambassador.phone}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{ambassador.region}</TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    className="h-8 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewClients(ambassador.id);
                    }}
                  >
                    {ambassador.clientsCount} clients
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <Button
                      variant="ghost"
                      className="h-8 px-2 text-xs justify-start"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewCommissions(ambassador.id);
                      }}
                    >
                      <div className="font-medium text-sm">
                        {formatCurrency(ambassador.commissionsTotal)}
                      </div>
                    </Button>
                    {ambassador.lastCommission > 0 && (
                      <div className="text-xs text-muted-foreground flex items-center">
                        <ReceiptEuro className="h-3 w-3 mr-1" />
                        Dernière: {formatCurrency(ambassador.lastCommission)}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Badge variant={ambassador.status === 'active' ? 'default' : 'secondary'} className={
                    ambassador.status === 'active' 
                      ? "bg-green-100 text-green-800 hover:bg-green-100" 
                      : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                  }>
                    {ambassador.status === 'active' ? 'Actif' : 'Inactif'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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
                      <DropdownMenuItem onClick={() => handleViewProfile(ambassador.id)}>
                        Afficher le profil
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditAmbassador(ambassador.id)}>
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleViewClients(ambassador.id)}>
                        Voir les clients
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleViewCommissions(ambassador.id)}>
                        Voir les commissions
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleToggleStatus(ambassador.id)} 
                        className={ambassador.status === 'active' ? "text-amber-600" : "text-green-600"}
                      >
                        {ambassador.status === 'active' ? 'Désactiver' : 'Activer'}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteAmbassador(ambassador.id)} 
                        className="text-red-600"
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
                  <Button 
                    variant="outline" 
                    onClick={handleAddAmbassador} 
                    className="mt-4 gap-2"
                  >
                    <HeartHandshake className="h-4 w-4" />
                    Ajouter un ambassadeur
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <AmbassadorModal 
        isOpen={isAddModalOpen} 
        onClose={() => {
          setIsAddModalOpen(false);
          setCurrentAmbassador(null);
        }} 
        onSubmit={handleSaveAmbassador}
        isSubmitting={isSubmitting}
      />

      <AmbassadorModal 
        isOpen={isEditModalOpen} 
        onClose={() => {
          setIsEditModalOpen(false);
          setCurrentAmbassador(null);
        }} 
        ambassador={currentAmbassador ? convertAmbassadorToFormValues(currentAmbassador) : undefined}
        onSubmit={handleSaveAmbassador}
        isSubmitting={isSubmitting}
      />

      <ClientsView 
        isOpen={isClientsViewOpen}
        onClose={() => {
          setIsClientsViewOpen(false);
          setCurrentAmbassadorWithClients(null);
        }}
        owner={{ 
          id: currentAmbassadorWithClients?.id || '', 
          name: currentAmbassadorWithClients?.name || '', 
          type: 'ambassador' 
        }}
        clients={currentAmbassadorWithClients?.clients || []}
      />

      <CommissionsView 
        isOpen={isCommissionsViewOpen}
        onClose={() => {
          setIsCommissionsViewOpen(false);
          setCurrentAmbassadorWithCommissions(null);
        }}
        owner={{ 
          id: currentAmbassadorWithCommissions?.id || '', 
          name: currentAmbassadorWithCommissions?.name || '', 
          type: 'ambassador' 
        }}
        commissions={currentAmbassadorWithCommissions?.commissions || []}
      />

      <AlertDialog 
        open={isDeleteDialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setIsDeleteDialogOpen(false);
            setCurrentAmbassador(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmez la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'ambassadeur <strong>{currentAmbassador?.name}</strong> ? 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false);
              setCurrentAmbassador(null);
            }}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AmbassadorsList;
