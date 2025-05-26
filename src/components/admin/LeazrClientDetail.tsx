
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, 
  Users, 
  CreditCard, 
  Activity,
  ArrowLeft,
  Settings,
  Calendar,
  Mail,
  Phone
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface LeazrClientDetailProps {
  clientId: string;
  onBack: () => void;
}

interface ClientDetail {
  id: string;
  name: string;
  email: string;
  phone?: string;
  plan: 'starter' | 'pro' | 'business';
  status: 'active' | 'trial' | 'expired' | 'cancelled';
  usersCount: number;
  subscriptionStart: Date;
  subscriptionEnd?: Date;
  createdAt: Date;
  lastActivity?: Date;
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    lastLogin?: Date;
  }>;
}

// Données de démonstration
const mockClientDetail: ClientDetail = {
  id: '1',
  name: 'Entreprise Alpha',
  email: 'contact@alpha.com',
  phone: '+33 1 23 45 67 89',
  plan: 'business',
  status: 'active',
  usersCount: 25,
  subscriptionStart: new Date('2024-01-15'),
  subscriptionEnd: new Date('2024-12-31'),
  createdAt: new Date('2024-01-15'),
  lastActivity: new Date('2024-11-20'),
  users: [
    {
      id: '1',
      name: 'Jean Dupont',
      email: 'jean.dupont@alpha.com',
      role: 'Admin',
      lastLogin: new Date('2024-11-25')
    },
    {
      id: '2',
      name: 'Marie Martin',
      email: 'marie.martin@alpha.com',
      role: 'Utilisateur',
      lastLogin: new Date('2024-11-24')
    }
  ]
};

const LeazrClientDetail: React.FC<LeazrClientDetailProps> = ({
  clientId,
  onBack
}) => {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulation du chargement des détails du client
    setTimeout(() => {
      setClient(mockClientDetail);
      setIsLoading(false);
    }, 500);
  }, [clientId]);

  const formatDate = (date: Date) => {
    return format(date, "dd MMMM yyyy", { locale: fr });
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement des détails...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Client introuvable</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{client.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              {getPlanBadge(client.plan)}
              {getStatusBadge(client.status)}
            </div>
          </div>
        </div>
        <Button>
          <Settings className="h-4 w-4 mr-2" />
          Gérer le compte
        </Button>
      </div>

      {/* Informations générales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Informations de contact</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">{client.email}</span>
              </div>
              {client.phone && (
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">{client.phone}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abonnement</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Début: </span>
                {formatDate(client.subscriptionStart)}
              </div>
              {client.subscriptionEnd && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Fin: </span>
                  {formatDate(client.subscriptionEnd)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activité</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Créé le: </span>
                {formatDate(client.createdAt)}
              </div>
              {client.lastActivity && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Dernière activité: </span>
                  {formatDate(client.lastActivity)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets détaillés */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">Utilisateurs ({client.usersCount})</TabsTrigger>
          <TabsTrigger value="subscription">Abonnement</TabsTrigger>
          <TabsTrigger value="activity">Activité</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Utilisateurs du compte</CardTitle>
              <CardDescription>
                Liste des utilisateurs ayant accès au compte Leazr
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {client.users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{user.role}</Badge>
                      {user.lastLogin && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Dernière connexion: {formatDate(user.lastLogin)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="subscription" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Détails de l'abonnement</CardTitle>
              <CardDescription>
                Informations sur l'abonnement et la facturation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Plan actuel</label>
                    <div className="mt-1">{getPlanBadge(client.plan)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Statut</label>
                    <div className="mt-1">{getStatusBadge(client.status)}</div>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <Button variant="outline">Modifier l'abonnement</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Journal d'activité</CardTitle>
              <CardDescription>
                Historique des actions importantes sur le compte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 border-l-4 border-blue-500 bg-blue-50">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="font-medium">Compte créé</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(client.createdAt)}
                    </div>
                  </div>
                </div>
                {client.lastActivity && (
                  <div className="flex items-center gap-3 p-3 border-l-4 border-green-500 bg-green-50">
                    <Activity className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="font-medium">Dernière activité</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(client.lastActivity)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeazrClientDetail;
