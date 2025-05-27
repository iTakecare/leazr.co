
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  Mail,
  Phone,
  Building,
  Calendar
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface SaaSClient {
  id: string;
  companyName: string;
  adminEmail: string;
  adminName: string;
  plan: string;
  status: 'active' | 'trial' | 'suspended' | 'cancelled';
  subscriptionDate: string;
  lastLogin: string;
  monthlyRevenue: number;
  usersCount: number;
  modulesUsed: string[];
}

const SaaSClientsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<SaaSClient | null>(null);

  // Données de démonstration
  const [clients] = useState<SaaSClient[]>([
    {
      id: '1',
      companyName: 'TechCorp Solutions',
      adminEmail: 'admin@techcorp.com',
      adminName: 'Jean Dupont',
      plan: 'Business',
      status: 'active',
      subscriptionDate: '2024-01-15',
      lastLogin: '2024-05-25',
      monthlyRevenue: 299,
      usersCount: 8,
      modulesUsed: ['CRM', 'Catalogue', 'Contrats']
    },
    {
      id: '2',
      companyName: 'StartupX',
      adminEmail: 'contact@startupx.fr',
      adminName: 'Marie Martin',
      plan: 'Pro',
      status: 'trial',
      subscriptionDate: '2024-05-20',
      lastLogin: '2024-05-26',
      monthlyRevenue: 149,
      usersCount: 3,
      modulesUsed: ['CRM', 'Catalogue']
    },
    {
      id: '3',
      companyName: 'Enterprise Ltd',
      adminEmail: 'admin@enterprise.com',
      adminName: 'Pierre Leroy',
      plan: 'Business',
      status: 'active',
      subscriptionDate: '2023-11-10',
      lastLogin: '2024-05-24',
      monthlyRevenue: 299,
      usersCount: 15,
      modulesUsed: ['CRM', 'Catalogue', 'Contrats', 'IA Assistant']
    }
  ]);

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      trial: 'bg-blue-100 text-blue-800',
      suspended: 'bg-orange-100 text-orange-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPlanBadge = (plan: string) => {
    const colors = {
      Starter: 'bg-gray-100 text-gray-800',
      Pro: 'bg-purple-100 text-purple-800',
      Business: 'bg-blue-100 text-blue-800'
    };
    return colors[plan as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.adminEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || client.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* En-tête avec actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Clients SaaS</h2>
          <p className="text-muted-foreground">Gestion des clients de la plateforme Leazr</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Ajouter un nouveau client SaaS</DialogTitle>
              <DialogDescription>
                Créer un nouvel accès à la plateforme Leazr pour un client
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="companyName">Nom de l'entreprise</Label>
                <Input id="companyName" placeholder="Ex: TechCorp Solutions" />
              </div>
              <div>
                <Label htmlFor="adminEmail">Email administrateur</Label>
                <Input id="adminEmail" type="email" placeholder="admin@techcorp.com" />
              </div>
              <div>
                <Label htmlFor="adminName">Nom administrateur</Label>
                <Input id="adminName" placeholder="Jean Dupont" />
              </div>
              <div>
                <Label htmlFor="plan">Plan d'abonnement</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter - 49€/mois</SelectItem>
                    <SelectItem value="pro">Pro - 149€/mois</SelectItem>
                    <SelectItem value="business">Business - 299€/mois</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button>Créer le client</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardContent className="p-6">
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom d'entreprise ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="trial">Essai</SelectItem>
                <SelectItem value="suspended">Suspendu</SelectItem>
                <SelectItem value="cancelled">Annulé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des clients */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des clients ({filteredClients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entreprise</TableHead>
                <TableHead>Administrateur</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Revenus/mois</TableHead>
                <TableHead>Utilisateurs</TableHead>
                <TableHead>Dernière connexion</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{client.companyName}</div>
                      <div className="text-sm text-muted-foreground flex items-center mt-1">
                        <Calendar className="h-3 w-3 mr-1" />
                        Client depuis {new Date(client.subscriptionDate).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{client.adminName}</div>
                      <div className="text-sm text-muted-foreground flex items-center mt-1">
                        <Mail className="h-3 w-3 mr-1" />
                        {client.adminEmail}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPlanBadge(client.plan)}>
                      {client.plan}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadge(client.status)}>
                      {client.status === 'active' ? 'Actif' : 
                       client.status === 'trial' ? 'Essai' :
                       client.status === 'suspended' ? 'Suspendu' : 'Annulé'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {client.monthlyRevenue}€
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <span className="font-medium">{client.usersCount}</span>
                      <span className="text-sm text-muted-foreground ml-1">utilisateurs</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(client.lastLogin).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          Voir les détails
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="h-4 w-4 mr-2" />
                          Contacter
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SaaSClientsList;
