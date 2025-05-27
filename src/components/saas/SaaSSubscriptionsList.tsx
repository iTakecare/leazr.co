
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
  CreditCard, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  DollarSign,
  Calendar,
  MoreHorizontal,
  RefreshCw,
  Pause,
  Play
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Subscription {
  id: string;
  companyName: string;
  plan: string;
  status: 'active' | 'trial' | 'past_due' | 'cancelled' | 'paused';
  amount: number;
  billingCycle: 'monthly' | 'yearly';
  nextBilling: string;
  startDate: string;
  paymentMethod: string;
  lastPayment: string;
  totalRevenue: number;
}

const SaaSSubscriptionsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPlan, setFilterPlan] = useState('all');

  // Données de démonstration
  const [subscriptions] = useState<Subscription[]>([
    {
      id: '1',
      companyName: 'TechCorp Solutions',
      plan: 'Business',
      status: 'active',
      amount: 299,
      billingCycle: 'monthly',
      nextBilling: '2024-06-15',
      startDate: '2024-01-15',
      paymentMethod: 'Carte bancaire ****1234',
      lastPayment: '2024-05-15',
      totalRevenue: 1495
    },
    {
      id: '2',
      companyName: 'StartupX',
      plan: 'Pro',
      status: 'trial',
      amount: 149,
      billingCycle: 'monthly',
      nextBilling: '2024-06-20',
      startDate: '2024-05-20',
      paymentMethod: 'Essai gratuit',
      lastPayment: '-',
      totalRevenue: 0
    },
    {
      id: '3',
      companyName: 'Enterprise Ltd',
      plan: 'Business',
      status: 'past_due',
      amount: 299,
      billingCycle: 'monthly',
      nextBilling: '2024-05-25',
      startDate: '2023-11-10',
      paymentMethod: 'Carte bancaire ****5678',
      lastPayment: '2024-04-25',
      totalRevenue: 2093
    },
    {
      id: '4',
      companyName: 'Growth Company',
      plan: 'Pro',
      status: 'active',
      amount: 1590,
      billingCycle: 'yearly',
      nextBilling: '2025-03-10',
      startDate: '2024-03-10',
      paymentMethod: 'Virement bancaire',
      lastPayment: '2024-03-10',
      totalRevenue: 1590
    }
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'trial':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'past_due':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'cancelled':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      trial: 'bg-blue-100 text-blue-800',
      past_due: 'bg-orange-100 text-orange-800',
      cancelled: 'bg-red-100 text-red-800',
      paused: 'bg-gray-100 text-gray-800'
    };
    const labels = {
      active: 'Actif',
      trial: 'Essai',
      past_due: 'Impayé',
      cancelled: 'Annulé',
      paused: 'Suspendu'
    };
    return { color: colors[status as keyof typeof colors], label: labels[status as keyof typeof labels] };
  };

  const getPlanBadge = (plan: string) => {
    const colors = {
      Starter: 'bg-gray-100 text-gray-800',
      Pro: 'bg-purple-100 text-purple-800',
      Business: 'bg-blue-100 text-blue-800'
    };
    return colors[plan as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;
    const matchesPlan = filterPlan === 'all' || sub.plan === filterPlan;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const totalRevenue = subscriptions.reduce((sum, sub) => sum + sub.totalRevenue, 0);
  const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active').length;
  const monthlyRevenue = subscriptions
    .filter(sub => sub.status === 'active')
    .reduce((sum, sub) => sum + (sub.billingCycle === 'yearly' ? sub.amount / 12 : sub.amount), 0);

  return (
    <div className="space-y-6">
      {/* Métriques en haut */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus totaux</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue.toLocaleString('fr-FR')}€</div>
            <p className="text-xs text-muted-foreground">
              Depuis le début
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus mensuels</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(monthlyRevenue).toLocaleString('fr-FR')}€</div>
            <p className="text-xs text-muted-foreground">
              Récurrent mensuel
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abonnements actifs</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              Sur {subscriptions.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de rétention</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.2%</div>
            <p className="text-xs text-muted-foreground">
              Ce mois-ci
            </p>
          </CardContent>
        </Card>
      </div>

      {/* En-tête avec actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Abonnements SaaS</h2>
          <p className="text-muted-foreground">Gestion des abonnements et paiements</p>
        </div>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardContent className="p-6">
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom d'entreprise..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="trial">Essai</SelectItem>
                <SelectItem value="past_due">Impayé</SelectItem>
                <SelectItem value="cancelled">Annulé</SelectItem>
                <SelectItem value="paused">Suspendu</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPlan} onValueChange={setFilterPlan}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les plans</SelectItem>
                <SelectItem value="Starter">Starter</SelectItem>
                <SelectItem value="Pro">Pro</SelectItem>
                <SelectItem value="Business">Business</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des abonnements */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des abonnements ({filteredSubscriptions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entreprise</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Prochaine facture</TableHead>
                <TableHead>Revenus totaux</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.map((subscription) => {
                const statusInfo = getStatusBadge(subscription.status);
                return (
                  <TableRow key={subscription.id}>
                    <TableCell>
                      <div className="font-medium">{subscription.companyName}</div>
                      <div className="text-sm text-muted-foreground">
                        Depuis {new Date(subscription.startDate).toLocaleDateString('fr-FR')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPlanBadge(subscription.plan)}>
                        {subscription.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(subscription.status)}
                        <Badge className={statusInfo.color}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {subscription.amount.toLocaleString('fr-FR')}€
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {subscription.billingCycle === 'monthly' ? 'Mensuel' : 'Annuel'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {subscription.status === 'trial' 
                          ? `Fin d'essai: ${new Date(subscription.nextBilling).toLocaleDateString('fr-FR')}`
                          : new Date(subscription.nextBilling).toLocaleDateString('fr-FR')
                        }
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {subscription.totalRevenue.toLocaleString('fr-FR')}€
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
                            <CreditCard className="h-4 w-4 mr-2" />
                            Voir la facturation
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Renouveler
                          </DropdownMenuItem>
                          {subscription.status === 'active' ? (
                            <DropdownMenuItem>
                              <Pause className="h-4 w-4 mr-2" />
                              Suspendre
                            </DropdownMenuItem>
                          ) : subscription.status === 'paused' ? (
                            <DropdownMenuItem>
                              <Play className="h-4 w-4 mr-2" />
                              Réactiver
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SaaSSubscriptionsList;
