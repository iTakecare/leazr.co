
import React, { useState, useCallback, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BadgePercent, MoreHorizontal, Mail, Phone, Building2, Banknote, AlertCircle, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/utils/formatters";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import PartnerModal from './modals/PartnerModal';
import ClientsView from './detail/ClientsView';
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
import { 
  Partner, 
  PartnerFormValues, 
  getPartners, 
  createPartner, 
  updatePartner, 
  deletePartner, 
  getPartnerClients, 
  PartnerType 
} from '@/services/partnerService';

interface PartnerWithClients extends Partner {
  clients: any[];
}

interface PartnersListProps {
  searchTerm?: string;
  statusFilter?: string;
}

const PartnersList: React.FC<PartnersListProps> = ({ searchTerm = '', statusFilter = 'all' }) => {
  const navigate = useNavigate();
  const [partnersList, setPartnersList] = useState<Partner[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentPartner, setCurrentPartner] = useState<Partner | null>(null);
  const [isClientsViewOpen, setIsClientsViewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentPartnerWithClients, setCurrentPartnerWithClients] = useState<PartnerWithClients | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch partners on component mount
  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPartners();
      setPartnersList(data);
    } catch (err) {
      console.error("Error fetching partners:", err);
      setError("Erreur lors du chargement des partenaires");
      toast.error("Erreur lors du chargement des partenaires");
    } finally {
      setLoading(false);
    }
  };

  // Filter partners based on search term and status filter
  const filteredPartners = partnersList.filter(partner => {
    // Filtre par terme de recherche
    const matchesSearch = 
      partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (partner.email && partner.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (partner.contactName && partner.contactName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filtre par statut
    const matchesStatus = statusFilter === "all" || partner.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleAddPartner = () => {
    setCurrentPartner(null);
    setIsAddModalOpen(true);
  };

  const handleEditPartner = (id: string) => {
    const partner = partnersList.find(p => p.id === id);
    if (partner) {
      setCurrentPartner({...partner});
      setIsEditModalOpen(true);
    }
  };

  const handleViewProfile = (id: string) => {
    navigate(`/partners/${id}`);
  };

  const handleViewClients = async (id: string) => {
    try {
      const partner = partnersList.find(p => p.id === id);
      if (!partner) {
        toast.error("Partenaire introuvable");
        return;
      }
      
      const clients = await getPartnerClients(id);
      setCurrentPartnerWithClients({
        ...partner,
        clients: clients
      });
      setIsClientsViewOpen(true);
    } catch (err) {
      console.error("Error fetching partner clients:", err);
      toast.error("Erreur lors du chargement des clients du partenaire");
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const partner = partnersList.find(p => p.id === id);
      if (!partner) {
        toast.error("Partenaire introuvable");
        return;
      }
      
      const newStatus = partner.status === 'active' ? 'inactive' : 'active';
      
      // Create properly typed update data
      const updateData: Partial<PartnerFormValues> = { 
        status: newStatus as 'active' | 'inactive'
      };
      
      await updatePartner(id, updateData);
      
      setPartnersList(prevList => 
        prevList.map(p => 
          p.id === id 
            ? { ...p, status: newStatus } 
            : p
        )
      );
      
      toast.success(`Le statut du partenaire ${partner?.name} a été changé en "${newStatus === 'active' ? 'Actif' : 'Inactif'}"`);
    } catch (err) {
      console.error("Error updating partner status:", err);
      toast.error("Erreur lors de la mise à jour du statut du partenaire");
    }
  };

  const handleDeletePartner = (id: string) => {
    const partner = partnersList.find(p => p.id === id);
    if (partner) {
      setCurrentPartner({...partner});
      setIsDeleteDialogOpen(true);
    }
  };

  const confirmDelete = useCallback(async () => {
    if (!currentPartner) return;
    
    try {
      const partnerToDelete = {...currentPartner};
      
      // First, reset all states to prevent any stuck references
      setCurrentPartner(null);
      setCurrentPartnerWithClients(null);
      
      // Close all dialogs/modals
      setIsDeleteDialogOpen(false);
      setIsEditModalOpen(false);
      setIsClientsViewOpen(false);
      
      // Delete from database
      await deletePartner(partnerToDelete.id);
      
      // Then update the list
      setPartnersList(prevList => prevList.filter(p => p.id !== partnerToDelete.id));
      
      // Show success notification
      toast.success(`Le partenaire ${partnerToDelete.name} a été supprimé`);
      
    } catch (error) {
      console.error("Erreur lors de la suppression du partenaire:", error);
      toast.error("Une erreur est survenue lors de la suppression du partenaire");
      
      // Make sure dialogs are closed even on error
      setIsDeleteDialogOpen(false);
    }
  }, [currentPartner]);

  const handleSavePartner = async (data: PartnerFormValues) => {
    setIsSubmitting(true);
    
    try {
      if (currentPartner?.id) {
        // Update existing partner
        await updatePartner(currentPartner.id, data);
        
        // Update the local partner list with properly typed values
        setPartnersList(prevList => 
          prevList.map(partner => 
            partner.id === currentPartner.id
              ? { 
                  ...partner, 
                  name: data.name,
                  contactName: data.contactName,
                  email: data.email,
                  phone: data.phone || "",
                  type: data.type,
                  notes: data.notes
                }
              : partner
          )
        );
        toast.success(`Le partenaire ${data.name} a été mis à jour`);
        setIsEditModalOpen(false);
      } else {
        // Create new partner
        const newPartner = await createPartner(data);
        
        if (newPartner) {
          setPartnersList(prevList => [...prevList, newPartner]);
          toast.success(`Le partenaire ${data.name} a été ajouté`);
          setIsAddModalOpen(false);
        }
      }
    } catch (err) {
      console.error("Error saving partner:", err);
      toast.error("Erreur lors de l'enregistrement du partenaire");
    } finally {
      setIsSubmitting(false);
      setCurrentPartner(null);
    }
  };

  const closeAllModals = useCallback(() => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setIsClientsViewOpen(false);
    setIsDeleteDialogOpen(false);
    setCurrentPartner(null);
    setCurrentPartnerWithClients(null);
  }, []);

  // Function to convert a Partner to PartnerFormValues for the form
  const convertPartnerToFormValues = (partner: Partner): PartnerFormValues => {
    return {
      name: partner.name,
      contactName: partner.contactName,
      email: partner.email,
      phone: partner.phone,
      type: partner.type,
      status: partner.status as "active" | "inactive",
      notes: partner.notes || ""
    };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Chargement des partenaires...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchPartners}>Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Société</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Clients</TableHead>
            <TableHead>Revenus</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPartners.length > 0 ? (
            filteredPartners.map((partner) => (
              <TableRow key={partner.id} className="cursor-pointer" onClick={() => handleViewProfile(partner.id)}>
                <TableCell className="font-medium">{partner.name}</TableCell>
                <TableCell>
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Mail className="h-3 w-3 mr-1" />
                      {partner.email}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Phone className="h-3 w-3 mr-1" />
                      {partner.phone}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3 mr-1" />
                      {partner.contactName}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {partner.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    className="h-8 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewClients(partner.id);
                    }}
                  >
                    {partner.clientsCount} clients
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <div className="font-medium text-sm">
                      {formatCurrency(partner.revenueTotal)}
                    </div>
                    {partner.lastTransaction > 0 && (
                      <div className="text-xs text-muted-foreground flex items-center">
                        <Banknote className="h-3 w-3 mr-1" />
                        Dernière: {formatCurrency(partner.lastTransaction)}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Badge variant={partner.status === 'active' ? 'default' : 'secondary'} className={
                    partner.status === 'active' 
                      ? "bg-green-100 text-green-800 hover:bg-green-100" 
                      : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                  }>
                    {partner.status === 'active' ? 'Actif' : 'Inactif'}
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
                      <DropdownMenuItem onClick={() => handleViewProfile(partner.id)}>
                        Afficher le profil
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditPartner(partner.id)}>
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleViewClients(partner.id)}>
                        Voir les clients
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleToggleStatus(partner.id)} 
                        className={partner.status === 'active' ? "text-amber-600" : "text-green-600"}
                      >
                        {partner.status === 'active' ? 'Désactiver' : 'Activer'}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeletePartner(partner.id)} 
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
                  <p>Aucun partenaire trouvé</p>
                  <Button 
                    variant="outline" 
                    onClick={handleAddPartner} 
                    className="mt-4 gap-2"
                  >
                    <BadgePercent className="h-4 w-4" />
                    Ajouter un partenaire
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <PartnerModal 
        isOpen={isAddModalOpen} 
        onClose={() => {
          setIsAddModalOpen(false);
          setCurrentPartner(null);
        }} 
        onSubmit={handleSavePartner}
        isSubmitting={isSubmitting}
      />

      <PartnerModal 
        isOpen={isEditModalOpen} 
        onClose={() => {
          setIsEditModalOpen(false);
          setCurrentPartner(null);
        }} 
        partner={currentPartner ? convertPartnerToFormValues(currentPartner) : undefined}
        onSubmit={handleSavePartner}
        isSubmitting={isSubmitting}
      />

      <ClientsView 
        isOpen={isClientsViewOpen}
        onClose={() => {
          setIsClientsViewOpen(false);
          setCurrentPartnerWithClients(null);
        }}
        owner={{ 
          id: currentPartnerWithClients?.id || '', 
          name: currentPartnerWithClients?.name || '', 
          type: 'partner' 
        }}
        clients={currentPartnerWithClients?.clients || []}
      />

      <AlertDialog 
        open={isDeleteDialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setIsDeleteDialogOpen(false);
            setCurrentPartner(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmez la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le partenaire <strong>{currentPartner?.name}</strong> ? 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false);
              setCurrentPartner(null);
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

export default PartnersList;
