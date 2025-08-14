import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  CreditCard, 
  Search, 
  DollarSign,
  FileText,
  Download,
  MoreHorizontal,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import { useSaaSBilling } from "@/hooks/useSaaSData";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const SaaSBillingManager = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");

  const { billing, loading } = useSaaSBilling();

  const filteredInvoices = billing?.invoices?.filter(invoice => {
    const matchesSearch = invoice.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    const matchesPeriod = periodFilter === "all" || 
      (periodFilter === "current" && new Date(invoice.created_at) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    
    return matchesSearch && matchesStatus && matchesPeriod;
  }) || [];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { label: "Payée", variant: "default" as const, icon: CheckCircle },
      pending: { label: "En attente", variant: "secondary" as const, icon: Clock },
      overdue: { label: "En retard", variant: "destructive" as const, icon: AlertCircle },
      failed: { label: "Échec", variant: "destructive" as const, icon: AlertCircle },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || 
                   { label: status, variant: "outline" as const, icon: FileText };
    
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Chargement des données de facturation...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestion de la Facturation</h2>
          <p className="text-muted-foreground">Gérez les abonnements, factures et paiements</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Synchroniser Stripe
          </Button>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Générer rapport
          </Button>
        </div>
      </div>

      {/* Métriques financières */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenus ce mois</p>
                <p className="text-2xl font-bold">€{billing?.metrics?.monthly_revenue?.toLocaleString() || '0'}</p>
                <p className="text-xs text-muted-foreground">+{billing?.metrics?.revenue_growth || 0}% vs mois dernier</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Factures en attente</p>
                <p className="text-2xl font-bold">{billing?.metrics?.pending_invoices || 0}</p>
                <p className="text-xs text-orange-600">€{billing?.metrics?.pending_amount?.toLocaleString() || '0'} en attente</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Abonnements actifs</p>
                <p className="text-2xl font-bold">{billing?.metrics?.active_subscriptions || 0}</p>
                <p className="text-xs text-green-600">+{billing?.metrics?.new_subscriptions || 0} ce mois</p>
              </div>
              <CreditCard className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taux de paiement</p>
                <p className="text-2xl font-bold">{billing?.metrics?.payment_success_rate || 0}%</p>
                <p className="text-xs text-muted-foreground">{billing?.metrics?.failed_payments || 0} échecs</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par entreprise ou numéro de facture..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="paid">Payées</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="overdue">En retard</SelectItem>
                <SelectItem value="failed">Échec</SelectItem>
              </SelectContent>
            </Select>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les périodes</SelectItem>
                <SelectItem value="current">Ce mois</SelectItem>
                <SelectItem value="last">Mois dernier</SelectItem>
                <SelectItem value="quarter">Ce trimestre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des factures */}
      <Card>
        <CardHeader>
          <CardTitle>Factures ({filteredInvoices.length})</CardTitle>
          <CardDescription>
            Historique de toutes les factures et leur statut de paiement
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facture</TableHead>
                <TableHead>Entreprise</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date de création</TableHead>
                <TableHead>Date d'échéance</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{invoice.invoice_number}</p>
                      <p className="text-sm text-muted-foreground">
                        Période: {invoice.period_start} - {invoice.period_end}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{invoice.company_name}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{invoice.plan_name}</Badge>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">€{invoice.amount.toFixed(2)}</p>
                    {invoice.currency && invoice.currency !== 'EUR' && (
                      <p className="text-xs text-muted-foreground">{invoice.currency}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(invoice.status)}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">
                      {new Date(invoice.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">
                      {invoice.due_date 
                        ? new Date(invoice.due_date).toLocaleDateString('fr-FR')
                        : '-'
                      }
                    </p>
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
                          Voir détails
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Télécharger PDF
                        </DropdownMenuItem>
                        {invoice.status === 'pending' && (
                          <DropdownMenuItem>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Relancer paiement
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredInvoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-muted-foreground">Aucune facture trouvée</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Résumé des abonnements */}
      <Card>
        <CardHeader>
          <CardTitle>Abonnements Actifs</CardTitle>
          <CardDescription>Vue d'ensemble des abonnements en cours</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entreprise</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Prochaine facturation</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billing?.subscriptions?.map((subscription) => (
                <TableRow key={subscription.id}>
                  <TableCell>
                    <p className="font-medium">{subscription.company_name}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{subscription.plan_name}</Badge>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">€{subscription.price}/mois</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">
                      {subscription.next_billing_date 
                        ? new Date(subscription.next_billing_date).toLocaleDateString('fr-FR')
                        : '-'
                      }
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                      {subscription.status === 'active' ? 'Actif' : subscription.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) || (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-muted-foreground">Aucun abonnement actif</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SaaSBillingManager;