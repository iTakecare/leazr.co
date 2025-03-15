
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeartHandshake, MoreHorizontal, Mail, Phone, ReceiptEuro, AlertCircle } from "lucide-react";
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

// Define the interface for ambassador data structure to ensure type consistency
interface Ambassador {
  id: string;
  name: string;
  email: string;
  phone: string;
  region: string;
  clientsCount: number;
  commissionsTotal: number;
  lastCommission: number;
  status: string;
  notes?: string;
}

interface AmbassadorWithClients extends Ambassador {
  clients: any[];
}

interface AmbassadorWithCommissions extends Ambassador {
  commissions: any[];
}

// Données statiques pour démo
const ambassadors: Ambassador[] = [
  {
    id: '1',
    name: 'Jean Dupont',
    email: 'jean.dupont@example.com',
    phone: '+33 6 12 34 56 78',
    region: 'Île-de-France',
    clientsCount: 12,
    commissionsTotal: 8750,
    lastCommission: 1250,
    status: 'active'
  },
  {
    id: '2',
    name: 'Marie Martin',
    email: 'marie.martin@example.com',
    phone: '+33 6 23 45 67 89',
    region: 'Auvergne-Rhône-Alpes',
    clientsCount: 8,
    commissionsTotal: 5320,
    lastCommission: 980,
    status: 'active'
  },
  {
    id: '3',
    name: 'Pierre Bernard',
    email: 'pierre.bernard@example.com',
    phone: '+33 6 34 56 78 90',
    region: 'Nouvelle-Aquitaine',
    clientsCount: 5,
    commissionsTotal: 3150,
    lastCommission: 0,
    status: 'inactive'
  }
];

// Données des clients de démonstration
const mockClients = {
  '1': [
    { id: 'c1', name: 'ACME SAS', company: 'ACME', status: 'active', createdAt: '2023-05-12T10:30:00' },
    { id: 'c2', name: 'Dubois Équipements', company: 'Dubois Équipements', status: 'active', createdAt: '2023-06-22T14:15:00' },
    { id: 'c3', name: 'Centre Médical Rivière', company: 'Centre Médical Rivière', status: 'active', createdAt: '2023-08-05T09:45:00' },
  ],
  '2': [
    { id: 'c4', name: 'Clinique du Sport', company: 'Clinique du Sport', status: 'active', createdAt: '2023-07-15T11:20:00' },
    { id: 'c5', name: 'PhysioCare', company: 'PhysioCare', status: 'inactive', createdAt: '2023-09-30T16:00:00' },
  ],
  '3': [
    { id: 'c6', name: 'Cabinet Martin', company: 'Cabinet Martin', status: 'inactive', createdAt: '2023-04-10T08:30:00' },
  ]
};

// Données des commissions de démonstration
const mockCommissions = {
  '1': [
    { id: 'co1', amount: 2500, status: 'paid', client: 'ACME SAS', date: '2023-06-15T10:30:00', description: 'Commission sur vente de matériel' },
    { id: 'co2', amount: 1800, status: 'paid', client: 'Dubois Équipements', date: '2023-07-22T14:15:00', description: 'Commission sur contrat annuel' },
    { id: 'co3', amount: 3200, status: 'paid', client: 'Centre Médical Rivière', date: '2023-09-05T09:45:00', description: 'Commission sur équipement complet' },
    { id: 'co4', amount: 1250, status: 'pending', client: 'ACME SAS', date: '2023-10-18T15:30:00', description: 'Renouvellement contrat' },
  ],
  '2': [
    { id: 'co5', amount: 2100, status: 'paid', client: 'Clinique du Sport', date: '2023-08-12T11:20:00', description: 'Commission sur vente de matériel' },
    { id: 'co6', amount: 2240, status: 'paid', client: 'PhysioCare', date: '2023-09-25T16:00:00', description: 'Commission sur contrat annuel' },
    { id: 'co7', amount: 980, status: 'pending', client: 'Clinique du Sport', date: '2023-10-30T14:45:00', description: 'Extension de contrat' },
  ],
  '3': [
    { id: 'co8', amount: 1650, status: 'paid', client: 'Cabinet Martin', date: '2023-05-05T08:30:00', description: 'Commission sur vente de matériel' },
    { id: 'co9', amount: 1500, status: 'paid', client: 'Cabinet Martin', date: '2023-07-10T13:15:00', description: 'Renouvellement contrat' },
  ]
};

const AmbassadorsList = () => {
  const navigate = useNavigate();
  const [ambassadorsList, setAmbassadorsList] = useState<Ambassador[]>(ambassadors);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentAmbassador, setCurrentAmbassador] = useState<Ambassador | null>(null);
  const [isClientsViewOpen, setIsClientsViewOpen] = useState(false);
  const [isCommissionsViewOpen, setIsCommissionsViewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentAmbassadorWithClients, setCurrentAmbassadorWithClients] = useState<AmbassadorWithClients | null>(null);
  const [currentAmbassadorWithCommissions, setCurrentAmbassadorWithCommissions] = useState<AmbassadorWithCommissions | null>(null);

  const handleAddAmbassador = () => {
    setCurrentAmbassador(null);
    setIsAddModalOpen(true);
  };

  const handleEditAmbassador = (id: string) => {
    const ambassador = ambassadorsList.find(a => a.id === id);
    if (ambassador) {
      setCurrentAmbassador(ambassador);
      setIsEditModalOpen(true);
    }
  };

  const handleViewProfile = (id: string) => {
    navigate(`/ambassadors/${id}`);
  };

  const handleViewClients = (id: string) => {
    const ambassador = ambassadorsList.find(a => a.id === id);
    if (ambassador) {
      setCurrentAmbassadorWithClients({
        ...ambassador,
        clients: mockClients[id] || []
      });
      setIsClientsViewOpen(true);
    }
  };

  const handleViewCommissions = (id: string) => {
    const ambassador = ambassadorsList.find(a => a.id === id);
    if (ambassador) {
      setCurrentAmbassadorWithCommissions({
        ...ambassador,
        commissions: mockCommissions[id] || []
      });
      setIsCommissionsViewOpen(true);
    }
  };

  const handleToggleStatus = (id: string) => {
    setAmbassadorsList(prevList => 
      prevList.map(ambassador => 
        ambassador.id === id 
          ? { ...ambassador, status: ambassador.status === 'active' ? 'inactive' : 'active' } 
          : ambassador
      )
    );
    
    const ambassador = ambassadorsList.find(a => a.id === id);
    const newStatus = ambassador?.status === 'active' ? 'inactive' : 'active';
    
    toast.success(`Le statut de l'ambassadeur ${ambassador?.name} a été changé en "${newStatus === 'active' ? 'Actif' : 'Inactif'}"`);
  };

  const handleDeleteAmbassador = (id: string) => {
    const ambassador = ambassadorsList.find(a => a.id === id);
    if (ambassador) {
      setCurrentAmbassador(ambassador);
      setIsDeleteDialogOpen(true);
    }
  };

  const confirmDelete = () => {
    if (currentAmbassador) {
      try {
        // Supprimer l'ambassadeur de la liste
        setAmbassadorsList(prevList => prevList.filter(a => a.id !== currentAmbassador.id));
        
        // Notification de succès
        toast.success(`L'ambassadeur ${currentAmbassador.name} a été supprimé`);
        console.log("Ambassadeur supprimé avec succès:", currentAmbassador.id);
        
        // Fermer la boîte de dialogue de confirmation
        setIsDeleteDialogOpen(false);
        
        // Vider l'ambassadeur actuel pour éviter toute référence à un objet supprimé
        setCurrentAmbassador(null);

      } catch (error) {
        console.error("Erreur lors de la suppression de l'ambassadeur:", error);
        toast.error("Une erreur est survenue lors de la suppression de l'ambassadeur");
      }
    }
  };

  const handleSaveAmbassador = (data: AmbassadorFormValues) => {
    setIsSubmitting(true);
    
    setTimeout(() => {
      if (currentAmbassador?.id) {
        setAmbassadorsList(prevList => 
          prevList.map(ambassador => 
            ambassador.id === currentAmbassador.id
              ? { 
                  ...ambassador, 
                  name: data.name,
                  email: data.email,
                  phone: data.phone,
                  region: data.region,
                  notes: data.notes
                }
              : ambassador
          )
        );
        toast.success(`L'ambassadeur ${data.name} a été mis à jour`);
        setIsEditModalOpen(false);
      } else {
        const newAmbassador: Ambassador = {
          id: `${Date.now()}`, // Utiliser timestamp pour assurer l'unicité
          name: data.name,
          email: data.email,
          phone: data.phone,
          region: data.region,
          notes: data.notes,
          clientsCount: 0,
          commissionsTotal: 0,
          lastCommission: 0,
          status: 'active'
        };
        
        setAmbassadorsList(prevList => [...prevList, newAmbassador]);
        toast.success(`L'ambassadeur ${data.name} a été ajouté`);
        setIsAddModalOpen(false);
      }
      
      setIsSubmitting(false);
    }, 600);
  };

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
        onClose={() => setIsAddModalOpen(false)} 
        onSubmit={handleSaveAmbassador}
        isSubmitting={isSubmitting}
      />

      <AmbassadorModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        ambassador={currentAmbassador}
        onSubmit={handleSaveAmbassador}
        isSubmitting={isSubmitting}
      />

      <ClientsView 
        isOpen={isClientsViewOpen}
        onClose={() => setIsClientsViewOpen(false)}
        owner={{ 
          id: currentAmbassadorWithClients?.id || '', 
          name: currentAmbassadorWithClients?.name || '', 
          type: 'ambassador' 
        }}
        clients={currentAmbassadorWithClients?.clients || []}
      />

      <CommissionsView 
        isOpen={isCommissionsViewOpen}
        onClose={() => setIsCommissionsViewOpen(false)}
        owner={{ 
          id: currentAmbassadorWithCommissions?.id || '', 
          name: currentAmbassadorWithCommissions?.name || '', 
          type: 'ambassador' 
        }}
        commissions={currentAmbassadorWithCommissions?.commissions || []}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmez la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'ambassadeur <strong>{currentAmbassador?.name}</strong> ? 
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

export default AmbassadorsList;
