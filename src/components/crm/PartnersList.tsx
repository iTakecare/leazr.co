import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BadgePercent, MoreHorizontal, Building2, Mail, Phone, FileText } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/utils/formatters";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import PartnerModal from './modals/PartnerModal';
import PartnerDetail from './detail/PartnerDetail';
import ClientsView from './detail/ClientsView';
import CommissionsView from './detail/CommissionsView';
import OffersView from './detail/OffersView';
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
import { PartnerFormValues } from './forms/PartnerForm';

interface Partner {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  type: "Revendeur" | "Intégrateur" | "Consultant";
  commissionsTotal: number;
  status: string;
  notes?: string;
}

interface PartnerWithClients extends Partner {
  clients: any[];
}

interface PartnerWithCommissions extends Partner {
  commissions: any[];
}

interface PartnerWithOffers extends Partner {
  offers: any[];
}

const partners: Partner[] = [
  {
    id: '1',
    name: 'TechSolutions SAS',
    contactName: 'Alexandre Martin',
    email: 'contact@techsolutions.com',
    phone: '+33 1 23 45 67 89',
    type: 'Revendeur',
    commissionsTotal: 12500,
    status: 'active'
  },
  {
    id: '2',
    name: 'Digital Partners',
    contactName: 'Sophie Dubois',
    email: 'info@digitalpartners.com',
    phone: '+33 1 34 56 78 90',
    type: 'Intégrateur',
    commissionsTotal: 8750,
    status: 'active'
  },
  {
    id: '3',
    name: 'Innov IT',
    contactName: 'Thomas Petit',
    email: 'contact@innovit.fr',
    phone: '+33 1 45 67 89 01',
    type: 'Consultant',
    commissionsTotal: 5300,
    status: 'inactive'
  }
];

const mockClients = {
  '1': [
    { id: 'c1', name: 'Hôpital Saint-Louis', company: 'Hôpital Saint-Louis', status: 'active', createdAt: '2023-04-12T10:30:00' },
    { id: 'c2', name: 'Clinique des Alpes', company: 'Clinique des Alpes', status: 'active', createdAt: '2023-06-18T14:15:00' },
    { id: 'c3', name: 'Centre de Rééducation Paris', company: 'Centre de Rééducation Paris', status: 'active', createdAt: '2023-07-22T09:45:00' },
  ],
  '2': [
    { id: 'c4', name: 'Cabinet Médical Lyon', company: 'Cabinet Médical Lyon', status: 'active', createdAt: '2023-05-15T11:20:00' },
    { id: 'c5', name: 'Clinique du Sport Bordeaux', company: 'Clinique du Sport Bordeaux', status: 'active', createdAt: '2023-08-30T16:00:00' },
  ],
  '3': [
    { id: 'c6', name: 'Centre Orthopédique Marseille', company: 'Centre Orthopédique Marseille', status: 'inactive', createdAt: '2023-03-10T08:30:00' },
  ]
};

const mockCommissions = {
  '1': [
    { id: 'co1', amount: 3500, status: 'paid', client: 'Hôpital Saint-Louis', date: '2023-05-15T10:30:00', description: 'Commission sur vente initiale' },
    { id: 'co2', amount: 2800, status: 'paid', client: 'Clinique des Alpes', date: '2023-07-22T14:15:00', description: 'Commission sur contrat annuel' },
    { id: 'co3', amount: 4200, status: 'paid', client: 'Centre de Rééducation Paris', date: '2023-08-05T09:45:00', description: 'Commission sur équipement complet' },
    { id: 'co4', amount: 2000, status: 'pending', client: 'Hôpital Saint-Louis', date: '2023-10-18T15:30:00', description: 'Renouvellement contrat' },
  ],
  '2': [
    { id: 'co5', amount: 3100, status: 'paid', client: 'Cabinet Médical Lyon', date: '2023-06-12T11:20:00', description: 'Commission sur vente de matériel' },
    { id: 'co6', amount: 2850, status: 'paid', client: 'Clinique du Sport Bordeaux', date: '2023-08-25T16:00:00', description: 'Commission sur contrat annuel' },
    { id: 'co7', amount: 2800, status: 'pending', client: 'Cabinet Médical Lyon', date: '2023-10-30T14:45:00', description: 'Extension de contrat' },
  ],
  '3': [
    { id: 'co8', amount: 2650, status: 'paid', client: 'Centre Orthopédique Marseille', date: '2023-04-05T08:30:00', description: 'Commission sur vente de matériel' },
    { id: 'co9', amount: 2650, status: 'paid', client: 'Centre Orthopédique Marseille', date: '2023-07-10T13:15:00', description: 'Renouvellement contrat' },
  ]
};

const mockOffers = {
  '1': [
    { id: 'o1', title: 'Équipement Salle Kiné', clientName: 'Hôpital Saint-Louis', amount: 45000, status: 'signed', createdAt: '2023-04-15T10:30:00' },
    { id: 'o2', title: 'Maintenance Équipements', clientName: 'Clinique des Alpes', amount: 28000, status: 'signed', createdAt: '2023-06-20T14:15:00' },
    { id: 'o3', title: 'Solution complète rééducation', clientName: 'Centre de Rééducation Paris', amount: 72000, status: 'pending', createdAt: '2023-09-05T09:45:00' },
  ],
  '2': [
    { id: 'o4', title: 'Équipement Cabinet', clientName: 'Cabinet Médical Lyon', amount: 32000, status: 'signed', createdAt: '2023-05-18T11:20:00' },
    { id: 'o5', title: 'Solution Sport Pro', clientName: 'Clinique du Sport Bordeaux', amount: 58000, status: 'signed', createdAt: '2023-08-25T16:00:00' },
    { id: 'o6', title: 'Extension Matériel', clientName: 'Cabinet Médical Lyon', amount: 18500, status: 'pending', createdAt: '2023-10-12T14:45:00' },
  ],
  '3': [
    { id: 'o7', title: 'Équipement Centre', clientName: 'Centre Orthopédique Marseille', amount: 42000, status: 'signed', createdAt: '2023-03-15T08:30:00' },
    { id: 'o8', title: 'Maintenance Annuelle', clientName: 'Centre Orthopédique Marseille', amount: 12000, status: 'declined', createdAt: '2023-09-10T13:15:00' },
  ]
};

const PartnersList = () => {
  const navigate = useNavigate();
  const [partnersList, setPartnersList] = useState<Partner[]>(partners);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentPartner, setCurrentPartner] = useState<Partner | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isClientsViewOpen, setIsClientsViewOpen] = useState(false);
  const [isCommissionsViewOpen, setIsCommissionsViewOpen] = useState(false);
  const [isOffersViewOpen, setIsOffersViewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentPartnerWithClients, setCurrentPartnerWithClients] = useState<PartnerWithClients | null>(null);
  const [currentPartnerWithCommissions, setCurrentPartnerWithCommissions] = useState<PartnerWithCommissions | null>(null);
  const [currentPartnerWithOffers, setCurrentPartnerWithOffers] = useState<PartnerWithOffers | null>(null);

  const handleAddPartner = () => {
    setCurrentPartner(null);
    setIsAddModalOpen(true);
  };

  const handleEditPartner = (id: string) => {
    navigate(`/partners/edit/${id}`);
  };

  const handleViewProfile = (id: string) => {
    navigate(`/partners/${id}`);
  };

  const handleViewClients = (id: string) => {
    const partner = partnersList.find(p => p.id === id);
    if (partner) {
      setCurrentPartnerWithClients({
        ...partner,
        clients: mockClients[id] || []
      });
      setIsClientsViewOpen(true);
    }
  };

  const handleViewCommissions = (id: string) => {
    const partner = partnersList.find(p => p.id === id);
    if (partner) {
      setCurrentPartnerWithCommissions({
        ...partner,
        commissions: mockCommissions[id] || []
      });
      setIsCommissionsViewOpen(true);
    }
  };

  const handleViewOffers = (id: string) => {
    const partner = partnersList.find(p => p.id === id);
    if (partner) {
      setCurrentPartnerWithOffers({
        ...partner,
        offers: mockOffers[id] || []
      });
      setIsOffersViewOpen(true);
    }
  };

  const handleToggleStatus = (id: string) => {
    setPartnersList(prevList => 
      prevList.map(partner => 
        partner.id === id 
          ? { ...partner, status: partner.status === 'active' ? 'inactive' : 'active' } 
          : partner
      )
    );
    
    const partner = partnersList.find(p => p.id === id);
    const newStatus = partner?.status === 'active' ? 'inactive' : 'active';
    
    toast.success(`Le statut du partenaire ${partner?.name} a été changé en "${newStatus === 'active' ? 'Actif' : 'Inactif'}"`);
  };

  const handleDeletePartner = (id: string) => {
    const partner = partnersList.find(p => p.id === id);
    if (partner) {
      setCurrentPartner(partner);
      setIsDeleteDialogOpen(true);
    }
  };

  const confirmDelete = () => {
    if (currentPartner) {
      setPartnersList(prevList => prevList.filter(p => p.id !== currentPartner.id));
      toast.success(`Le partenaire ${currentPartner.name} a été supprimé`);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleSavePartner = (data: PartnerFormValues) => {
    setIsSubmitting(true);
    
    setTimeout(() => {
      if (currentPartner?.id) {
        setPartnersList(prevList => 
          prevList.map(partner => 
            partner.id === currentPartner.id
              ? { 
                  ...partner, 
                  name: data.name, 
                  contactName: data.contactName,
                  email: data.email,
                  phone: data.phone,
                  type: data.type,
                  notes: data.notes
                }
              : partner
          )
        );
        toast.success(`Le partenaire ${data.name} a été mis à jour`);
        setIsEditModalOpen(false);
      } else {
        const newPartner: Partner = {
          id: `${partnersList.length + 1}`,
          name: data.name,
          contactName: data.contactName,
          email: data.email,
          phone: data.phone,
          type: data.type,
          notes: data.notes,
          commissionsTotal: 0,
          status: 'active'
        };
        
        setPartnersList(prevList => [...prevList, newPartner]);
        toast.success(`Le partenaire ${data.name} a été ajouté`);
        setIsAddModalOpen(false);
      }
      
      setIsSubmitting(false);
    }, 600);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleAddPartner} className="gap-2">
          <BadgePercent className="h-4 w-4" />
          Ajouter un partenaire
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Société</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Commissions</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {partnersList.map((partner) => (
            <TableRow key={partner.id} className="cursor-pointer" onClick={() => handleViewProfile(partner.id)}>
              <TableCell>
                <div className="font-medium">{partner.name}</div>
                <div className="text-xs text-muted-foreground">{partner.contactName}</div>
              </TableCell>
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
                </div>
              </TableCell>
              <TableCell>{partner.type}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  className="h-8 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewCommissions(partner.id);
                  }}
                >
                  {formatCurrency(partner.commissionsTotal)}
                </Button>
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
                    <DropdownMenuItem onClick={() => handleViewOffers(partner.id)}>
                      Voir les offres
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleViewClients(partner.id)}>
                      Voir les clients
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleViewCommissions(partner.id)}>
                      Voir les commissions
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
          ))}
        </TableBody>
      </Table>

      <PartnerModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSubmit={handleSavePartner}
        isSubmitting={isSubmitting}
      />

      <PartnerModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        partner={currentPartner}
        onSubmit={handleSavePartner}
        isSubmitting={isSubmitting}
      />

      <PartnerDetail 
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        partner={currentPartner}
        onEdit={() => {
          setIsDetailOpen(false);
          handleEditPartner(currentPartner.id);
        }}
      />

      <ClientsView 
        isOpen={isClientsViewOpen}
        onClose={() => setIsClientsViewOpen(false)}
        owner={{ 
          id: currentPartnerWithClients?.id || '', 
          name: currentPartnerWithClients?.name || '', 
          type: 'partner' 
        }}
        clients={currentPartnerWithClients?.clients || []}
      />

      <CommissionsView 
        isOpen={isCommissionsViewOpen}
        onClose={() => setIsCommissionsViewOpen(false)}
        owner={{ 
          id: currentPartnerWithCommissions?.id || '', 
          name: currentPartnerWithCommissions?.name || '', 
          type: 'partner' 
        }}
        commissions={currentPartnerWithCommissions?.commissions || []}
      />

      <OffersView 
        isOpen={isOffersViewOpen}
        onClose={() => setIsOffersViewOpen(false)}
        owner={{ 
          id: currentPartnerWithOffers?.id || '', 
          name: currentPartnerWithOffers?.name || '', 
          type: 'partner' 
        }}
        offers={currentPartnerWithOffers?.offers || []}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmez la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le partenaire <strong>{currentPartner?.name}</strong> ? 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
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
