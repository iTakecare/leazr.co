
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft,
  Building2, 
  Users, 
  Calendar, 
  CreditCard,
  Settings,
  Activity,
  Package
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";

interface LeazrClientDetailProps {
  clientId: string;
  onBack: () => void;
}

interface ClientDetails {
  id: string;
  name: string;
  logo_url?: string;
  plan: string;
  is_active: boolean;
  created_at: string;
  trial_ends_at?: string;
  subscription_ends_at?: string;
  modules_enabled?: string[];
  users_count?: number;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
}

const LeazrClientDetail: React.FC<LeazrClientDetailProps> = ({
  clientId,
  onBack
}) => {
  const [client, setClient] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchClientDetails();
  }, [clientId]);

  const fetchClientDetails = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('companies')
        .select(`
          id,
          name,
          logo_url,
          plan,
          is_active,
          created_at,
          trial_ends_at,
          subscription_ends_at,
          modules_enabled,
          stripe_customer_id,
          stripe_subscription_id
        `)
        .eq('id', clientId)
        .single();

      if (error) {
        console.error('Erreur lors du chargement du client:', error);
        toast.error('Erreur lors du chargement du client');
        return;
      }

      setClient(data);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement du client');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!client?.is_active) {
      return <Badge variant="destructive">Inactif</Badge>;
    }
    
    if (client.trial_ends_at && new Date(client.trial_ends_at) > new Date()) {
      return <Badge variant="outline">Période d'essai</Badge>;
    }
    
    if (client.subscription_ends_at && new Date(client.subscription_ends_at) < new Date()) {
      return <Badge variant="destructive">Expiré</Badge>;
    }
    
    return <Badge variant="default">Actif</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Client non trouvé</p>
        <Button onClick={onBack} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={client.logo_url} alt={client.name} />
              <AvatarFallback>
                <Building2 className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{client.name}</h2>
              <div className="flex items-center space-x-2">
                {getStatusBadge()}
                <Badge variant="secondary">{client.plan}</Badge>
              </div>
            </div>
          </div>
        </div>
        <Button>
          <Settings className="h-4 w-4 mr-2" />
          Gérer
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">Client depuis</div>
            </div>
            <div className="text-2xl font-bold">
              {formatDistanceToNow(new Date(client.created_at), { locale: fr })}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">Modules actifs</div>
            </div>
            <div className="text-2xl font-bold">
              {client.modules_enabled?.length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">Utilisateurs</div>
            </div>
            <div className="text-2xl font-bold">
              {client.users_count || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">Plan</div>
            </div>
            <div className="text-2xl font-bold capitalize">
              {client.plan}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Aperçu</TabsTrigger>
          <TabsTrigger value="subscription">Abonnement</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="activity">Activité</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Nom de l'entreprise</label>
                  <p className="text-lg">{client.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Statut</label>
                  <div className="mt-1">{getStatusBadge()}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Date de création</label>
                  <p className="text-lg">
                    {format(new Date(client.created_at), 'dd/MM/yyyy', { locale: fr })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Plan actuel</label>
                  <p className="text-lg capitalize">{client.plan}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="subscription" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Détails de l'abonnement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">ID Stripe Customer</label>
                  <p className="text-sm font-mono">{client.stripe_customer_id || 'Non défini'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">ID Stripe Subscription</label>
                  <p className="text-sm font-mono">{client.stripe_subscription_id || 'Non défini'}</p>
                </div>
                {client.trial_ends_at && (
                  <div>
                    <label className="text-sm font-medium">Fin de l'essai</label>
                    <p className="text-lg">
                      {format(new Date(client.trial_ends_at), 'dd/MM/yyyy', { locale: fr })}
                    </p>
                  </div>
                )}
                {client.subscription_ends_at && (
                  <div>
                    <label className="text-sm font-medium">Fin de l'abonnement</label>
                    <p className="text-lg">
                      {format(new Date(client.subscription_ends_at), 'dd/MM/yyyy', { locale: fr })}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="modules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Modules activés</CardTitle>
              <CardDescription>
                Liste des modules auxquels ce client a accès
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {client.modules_enabled && client.modules_enabled.length > 0 ? (
                  client.modules_enabled.map((module, index) => (
                    <Badge key={index} variant="outline" className="justify-center py-2">
                      {module}
                    </Badge>
                  ))
                ) : (
                  <p className="text-muted-foreground">Aucun module activé</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activité récente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Activity className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">Aucune activité récente</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  L'historique d'activité sera affiché ici
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeazrClientDetail;
