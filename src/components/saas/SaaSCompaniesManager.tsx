import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Building2, 
  Search, 
  MoreHorizontal,
  Eye,
  Edit,
  Pause,
  DollarSign,
  Calendar,
  Users
} from "lucide-react";
import { useSaaSCompanies } from "@/hooks/useSaaSCompanies";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const SaaSCompaniesManager = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { companies, stats, loading } = useSaaSCompanies();

  // Actions des boutons
  const handleViewDetails = (company: any) => {
    console.log("🔍 Voir détails de:", company.name);
    // TODO: Ouvrir une modale avec les détails de l'entreprise
    alert(`Détails de ${company.name}\nPlan: ${company.plan}\nStatut: ${company.account_status}\nUtilisateurs: ${company.user_count}`);
  };

  const handleManageSubscription = (company: any) => {
    console.log("⚙️ Gérer abonnement de:", company.name);
    // TODO: Ouvrir le gestionnaire d'abonnement
    alert(`Gestion d'abonnement pour ${company.name}\nPlan actuel: ${company.plan}`);
  };

  const handleSuspendAccount = (company: any) => {
    console.log("⏸️ Suspendre compte de:", company.name);
    if (confirm(`Êtes-vous sûr de vouloir suspendre le compte de ${company.name} ?`)) {
      // TODO: Implémenter la suspension du compte
      alert(`Compte ${company.name} suspendu (simulation)`);
    }
  };

  const filteredCompanies = companies?.filter(company => {
    const matchesSearch = company.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.primary_admin?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.primary_admin?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.primary_admin?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPlan = planFilter === "all" || company.plan === planFilter;
    const matchesStatus = statusFilter === "all" || company.account_status === statusFilter;
    
    return matchesSearch && matchesPlan && matchesStatus;
  }) || [];

  const getPlanBadge = (plan: string) => {
    const planConfig = {
      starter: { label: "Starter", variant: "secondary" as const },
      pro: { label: "Pro", variant: "default" as const },
      business: { label: "Business", variant: "default" as const },
      enterprise: { label: "Enterprise", variant: "default" as const },
    };
    
    const config = planConfig[plan as keyof typeof planConfig] || { label: plan, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: "Actif", variant: "default" as const },
      trial: { label: "Essai", variant: "secondary" as const },
      suspended: { label: "Suspendu", variant: "destructive" as const },
      expired: { label: "Expiré", variant: "outline" as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Chargement des entreprises...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Entreprises Clientes</h2>
          <p className="text-muted-foreground">Administrez vos clients entreprises et leurs abonnements</p>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Entreprises</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Abonnements Actifs</p>
                <p className="text-2xl font-bold text-green-600">{stats?.active || 0}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">En Essai</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.trial || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenus Mensuels</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats?.monthlyRevenue || 0)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
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
                  placeholder="Rechercher par nom d'entreprise ou contact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les plans</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="trial">Essai</SelectItem>
                <SelectItem value="suspended">Suspendu</SelectItem>
                <SelectItem value="expired">Expiré</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des entreprises */}
      <Card>
        <CardHeader>
          <CardTitle>Entreprises Clientes ({filteredCompanies.length})</CardTitle>
          <CardDescription>
            Liste de vos clients entreprises avec leurs détails d'abonnement
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entreprise</TableHead>
                <TableHead>Contact Principal</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date Souscription</TableHead>
                <TableHead>Date Fin</TableHead>
                <TableHead>Utilisateurs</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCompanies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {company.logo_url && (
                        <img 
                          src={company.logo_url} 
                          alt={`Logo ${company.name}`}
                          className="w-8 h-8 rounded object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium">{company.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {company.modules_enabled?.length || 0} module(s)
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {company.primary_admin ? (
                      <div>
                        <p className="font-medium">
                          {company.primary_admin.first_name} {company.primary_admin.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {company.primary_admin.email}
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Aucun contact</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {getPlanBadge(company.plan)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(company.account_status)}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{formatDate(company.created_at)}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">
                      {company.account_status === 'trial' 
                        ? formatDate(company.trial_ends_at)
                        : formatDate(company.subscription_ends_at)
                      }
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{company.user_count}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                       <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetails(company)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Voir détails
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleManageSubscription(company)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Gérer abonnement
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-orange-600"
                          onClick={() => handleSuspendAccount(company)}
                        >
                          <Pause className="h-4 w-4 mr-2" />
                          Suspendre
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredCompanies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-muted-foreground">Aucune entreprise trouvée</p>
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

export default SaaSCompaniesManager;