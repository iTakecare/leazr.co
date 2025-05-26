
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  CreditCard, 
  Calendar, 
  TrendingUp,
  AlertTriangle,
  Search,
  Filter
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { fr } from "date-fns/locale";

interface Subscription {
  id: string;
  company_name: string;
  plan: string;
  is_active: boolean;
  started_at: string;
  current_period_end?: string;
  stripe_subscription_id?: string;
  status: 'active' | 'trial' | 'expired' | 'cancelled';
}

const LeazrSubscriptionManagement = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('companies')
        .select(`
          id,
          name,
          plan,
          is_active,
          created_at,
          trial_ends_at,
          subscription_ends_at,
          stripe_subscription_id
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors du chargement des abonnements:', error);
        toast.error('Erreur lors du chargement des abonnements');
        return;
      }

      const formattedSubscriptions = data?.map(company => ({
        id: company.id,
        company_name: company.name,
        plan: company.plan,
        is_active: company.is_active,
        started_at: company.created_at,
        current_period_end: company.subscription_ends_at,
        stripe_subscription_id: company.stripe_subscription_id,
        status: getSubscriptionStatus(company)
      })) || [];

      setSubscriptions(formattedSubscriptions);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des abonnements');
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionStatus = (company: any): 'active' | 'trial' | 'expired' | 'cancelled' => {
    if (!company.is_active) return 'cancelled';
    
    if (company.trial_ends_at && new Date(company.trial_ends_at) > new Date()) {
      return 'trial';
    }
    
    if (company.subscription_ends_at && new Date(company.subscription_ends_at) < new Date()) {
      return 'expired';
    }
    
    return 'active';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Actif</Badge>;
      case 'trial':
        return <Badge variant="outline">Essai</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expiré</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Annulé</Badge>;
      default:
        return <Badge variant="secondary">Inconnu</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    const planColors = {
      starter: "bg-blue-100 text-blue-800",
      pro: "bg-purple-100 text-purple-800",
      business: "bg-green-100 text-green-800"
    };
    
    return (
      <Badge className={planColors[plan as keyof typeof planColors] || "bg-gray-100 text-gray-800"}>
        {plan.charAt(0).toUpperCase() + plan.slice(1)}
      </Badge>
    );
  };

  const getExpirationWarning = (subscription: Subscription) => {
    if (!subscription.current_period_end) return null;
    
    const endDate = new Date(subscription.current_period_end);
    const warningDate = addDays(new Date(), 7);
    
    if (isBefore(endDate, new Date())) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    
    if (isBefore(endDate, warningDate)) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    
    return null;
  };

  const filteredSubscriptions = subscriptions.filter(subscription => {
    const matchesSearch = subscription.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || subscription.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    trial: subscriptions.filter(s => s.status === 'trial').length,
    expired: subscriptions.filter(s => s.status === 'expired').length,
    expiringSoon: subscriptions.filter(s => {
      if (!s.current_period_end) return false;
      const endDate = new Date(s.current_period_end);
      const warningDate = addDays(new Date(), 7);
      return isBefore(endDate, warningDate) && isAfter(endDate, new Date());
    }).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">Total</div>
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div className="text-sm font-medium">Actifs</div>
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <div className="text-sm font-medium">En essai</div>
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.trial}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <div className="text-sm font-medium">Expire bientôt</div>
            </div>
            <div className="text-2xl font-bold text-yellow-600">{stats.expiringSoon}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom d'entreprise..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-md px-3 py-2"
        >
          <option value="all">Tous les statuts</option>
          <option value="active">Actifs</option>
          <option value="trial">En essai</option>
          <option value="expired">Expirés</option>
          <option value="cancelled">Annulés</option>
        </select>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Abonnements</CardTitle>
          <CardDescription>
            Gérez tous les abonnements de vos clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entreprise</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Début</TableHead>
                <TableHead>Fin de période</TableHead>
                <TableHead>Stripe ID</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.map((subscription) => (
                <TableRow key={subscription.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <span>{subscription.company_name}</span>
                      {getExpirationWarning(subscription)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getPlanBadge(subscription.plan)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(subscription.status)}
                  </TableCell>
                  <TableCell>
                    {format(new Date(subscription.started_at), 'dd/MM/yyyy', { locale: fr })}
                  </TableCell>
                  <TableCell>
                    {subscription.current_period_end 
                      ? format(new Date(subscription.current_period_end), 'dd/MM/yyyy', { locale: fr })
                      : 'N/A'
                    }
                  </TableCell>
                  <TableCell>
                    <code className="text-xs">
                      {subscription.stripe_subscription_id?.slice(0, 20) || 'N/A'}...
                    </code>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">
                      Gérer
                    </Button>
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

export default LeazrSubscriptionManagement;
