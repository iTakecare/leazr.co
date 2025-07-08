import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Building, 
  Calendar, 
  CreditCard, 
  Users, 
  Package, 
  Mail, 
  Phone,
  MapPin,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Activity
} from "lucide-react";
import { CompanyData, ModuleData, SupportTicket } from "@/hooks/useSaaSData";
import { supabase } from '@/integrations/supabase/client';

interface SaaSClientDetailModalProps {
  client: CompanyData | null;
  isOpen: boolean;
  onClose: () => void;
}

interface ClientStats {
  totalUsers: number;
  lastActivity: string;
  supportTickets: number;
  monthlyRevenue: number;
}

const SaaSClientDetailModal = ({ client, isOpen, onClose }: SaaSClientDetailModalProps) => {
  const [stats, setStats] = useState<ClientStats>({
    totalUsers: 0,
    lastActivity: 'N/A',
    supportTickets: 0,
    monthlyRevenue: 0
  });
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (client && isOpen) {
      fetchClientDetails();
    }
  }, [client, isOpen]);

  const fetchClientDetails = async () => {
    if (!client) return;
    
    setLoading(true);
    try {
      // Récupérer les modules
      const { data: modulesData } = await supabase
        .from('modules')
        .select('*');

      // Récupérer les tickets de support pour ce client
      const { data: ticketsData } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('company_id', client.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Récupérer les utilisateurs de la company
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, created_at')
        .eq('company_id', client.id);

      if (modulesData) setModules(modulesData);
      if (ticketsData) setTickets(ticketsData);

      // Calculer les statistiques
      const planPrices = { starter: 49, pro: 149, business: 299 };
      const monthlyRevenue = client.account_status === 'active' 
        ? planPrices[client.plan as keyof typeof planPrices] || 0 
        : 0;

      setStats({
        totalUsers: usersData?.length || 0,
        lastActivity: usersData && usersData.length > 0 
          ? new Date(Math.max(...usersData.map(u => new Date(u.created_at).getTime()))).toLocaleDateString('fr-FR')
          : 'N/A',
        supportTickets: ticketsData?.length || 0,
        monthlyRevenue
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des détails client:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!client) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'trial': return 'text-blue-600 bg-blue-50';
      case 'expired': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'starter': return 'text-gray-600 bg-gray-50';
      case 'pro': return 'text-purple-600 bg-purple-50';
      case 'business': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTrialProgress = () => {
    if (!client.trial_ends_at) return 0;
    
    const now = new Date();
    const trialEnd = new Date(client.trial_ends_at);
    const trialStart = new Date(client.created_at);
    
    const totalDuration = trialEnd.getTime() - trialStart.getTime();
    const elapsed = now.getTime() - trialStart.getTime();
    
    return Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
  };

  const daysUntilTrialEnd = () => {
    if (!client.trial_ends_at) return 0;
    
    const now = new Date();
    const trialEnd = new Date(client.trial_ends_at);
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(diffDays, 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Building className="h-6 w-6" />
            {client.name}
          </DialogTitle>
          <DialogDescription>
            Fiche détaillée du client SaaS
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Statut et informations principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Statut</p>
                    <Badge className={getStatusColor(client.account_status)}>
                      {client.account_status === 'active' ? 'Actif' : 
                       client.account_status === 'trial' ? 'Essai' : 
                       client.account_status}
                    </Badge>
                  </div>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Plan</p>
                    <Badge className={getPlanColor(client.plan)}>
                      {client.plan}
                    </Badge>
                  </div>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Utilisateurs</p>
                    <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  </div>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Revenus/mois</p>
                    <p className="text-2xl font-bold">{stats.monthlyRevenue}€</p>
                  </div>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progression de l'essai pour les clients en trial */}
          {client.account_status === 'trial' && client.trial_ends_at && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Période d'essai
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Progression</span>
                    <span>{daysUntilTrialEnd()} jours restants</span>
                  </div>
                  <Progress value={getTrialProgress()} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    Essai se termine le {new Date(client.trial_ends_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="modules">Modules</TabsTrigger>
              <TabsTrigger value="support">Support</TabsTrigger>
              <TabsTrigger value="activity">Activité</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informations générales</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Créé le {new Date(client.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Admin: {client.profile?.first_name} {client.profile?.last_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Dernière activité: {stats.lastActivity}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Métriques</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Tickets support</span>
                      <span className="text-sm font-medium">{stats.supportTickets}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Modules actifs</span>
                      <span className="text-sm font-medium">{client.modules_enabled?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Revenus générés</span>
                      <span className="text-sm font-medium">{stats.monthlyRevenue}€/mois</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="modules" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Modules activés</CardTitle>
                  <CardDescription>
                    {client.modules_enabled?.length || 0} modules sur {modules.length} disponibles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {modules.map((module) => {
                      const isEnabled = client.modules_enabled?.includes(module.slug);
                      return (
                        <div 
                          key={module.id}
                          className={`p-3 rounded-lg border ${
                            isEnabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{module.name}</h4>
                              <p className="text-sm text-muted-foreground">{module.description}</p>
                            </div>
                            <Badge variant={isEnabled ? "default" : "secondary"}>
                              {isEnabled ? "Activé" : "Désactivé"}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="support" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tickets de support récents</CardTitle>
                  <CardDescription>
                    {stats.supportTickets} tickets au total
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {tickets.length > 0 ? (
                    <div className="space-y-3">
                      {tickets.map((ticket) => (
                        <div key={ticket.id} className="p-3 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium">{ticket.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {ticket.description}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge 
                                  variant={ticket.status === 'open' ? 'destructive' : 
                                          ticket.status === 'resolved' ? 'default' : 'secondary'}
                                >
                                  {ticket.status}
                                </Badge>
                                <Badge variant="outline">{ticket.priority}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(ticket.created_at).toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Aucun ticket de support pour ce client
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Activité récente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Compte créé le {new Date(client.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                    {client.trial_ends_at && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>Période d'essai jusqu'au {new Date(client.trial_ends_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    )}
                    {stats.supportTickets > 0 && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span>{stats.supportTickets} ticket(s) de support créé(s)</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
            <Button>
              Gérer le client
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SaaSClientDetailModal;