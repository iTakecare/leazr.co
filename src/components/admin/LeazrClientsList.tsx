
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Building2, 
  Calendar, 
  CreditCard, 
  Eye,
  Users,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface LeazrClient {
  id: string;
  name: string;
  plan: 'starter' | 'pro' | 'business';
  status: 'active' | 'trial' | 'expired' | 'cancelled';
  usersCount: number;
  subscriptionEnd?: Date;
  createdAt: Date;
  lastActivity?: Date;
}

interface LeazrClientsListProps {
  searchTerm: string;
  statusFilter: string;
  onClientSelect: (clientId: string) => void;
}

// Données de démonstration
const mockClients: LeazrClient[] = [
  {
    id: '1',
    name: 'Entreprise Alpha',
    plan: 'business',
    status: 'active',
    usersCount: 25,
    subscriptionEnd: new Date('2024-12-31'),
    createdAt: new Date('2024-01-15'),
    lastActivity: new Date('2024-11-20')
  },
  {
    id: '2',
    name: 'Beta Solutions',
    plan: 'pro',
    status: 'active',
    usersCount: 12,
    subscriptionEnd: new Date('2024-11-30'),
    createdAt: new Date('2024-03-10'),
    lastActivity: new Date('2024-11-25')
  },
  {
    id: '3',
    name: 'Gamma Tech',
    plan: 'starter',
    status: 'trial',
    usersCount: 5,
    subscriptionEnd: new Date('2024-12-05'),
    createdAt: new Date('2024-11-15'),
    lastActivity: new Date('2024-11-24')
  }
];

const LeazrClientsList: React.FC<LeazrClientsListProps> = ({
  searchTerm,
  statusFilter,
  onClientSelect
}) => {
  const [clients, setClients] = useState<LeazrClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulation du chargement des données
    setTimeout(() => {
      setClients(mockClients);
      setIsLoading(false);
    }, 1000);
  }, []);

  const filteredClients = clients.filter(client => {
    const matchesSearch = searchTerm === "" || 
      client.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Actif</Badge>;
      case 'trial':
        return <Badge variant="outline" className="border-blue-200 text-blue-700">Essai</Badge>;
      case 'expired':
        return <Badge variant="outline" className="border-red-200 text-red-700">Expiré</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Annulé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'starter':
        return <Badge variant="outline">Starter</Badge>;
      case 'pro':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Pro</Badge>;
      case 'business':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Business</Badge>;
      default:
        return <Badge variant="outline">{plan}</Badge>;
    }
  };

  const formatDate = (date: Date) => {
    return format(date, "dd MMM yyyy", { locale: fr });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement des clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="flex items-center p-4">
            <Building2 className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
              <p className="text-2xl font-bold">{clients.length}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-4">
            <Users className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Clients Actifs</p>
              <p className="text-2xl font-bold">{clients.filter(c => c.status === 'active').length}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-4">
            <Calendar className="h-8 w-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">En Essai</p>
              <p className="text-2xl font-bold">{clients.filter(c => c.status === 'trial').length}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-4">
            <AlertCircle className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Expirés</p>
              <p className="text-2xl font-bold">{clients.filter(c => c.status === 'expired').length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table des clients */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Clients ({filteredClients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">Aucun client trouvé</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Utilisateurs</TableHead>
                  <TableHead>Fin d'abonnement</TableHead>
                  <TableHead>Dernière activité</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{getPlanBadge(client.plan)}</TableCell>
                    <TableCell>{getStatusBadge(client.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                        {client.usersCount}
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.subscriptionEnd ? formatDate(client.subscriptionEnd) : '-'}
                    </TableCell>
                    <TableCell>
                      {client.lastActivity ? formatDate(client.lastActivity) : '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onClientSelect(client.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeazrClientsList;
