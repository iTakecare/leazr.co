import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  FileText, 
  HandshakeIcon,
  Activity,
  Calendar,
  UserPlus,
  PlusCircle,
  Eye,
  BarChart3,
  Download,
  DollarSign,
  Target,
  Clock,
  CheckCircle,
  RefreshCw,
  ShoppingBag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCompanyDashboard } from "@/hooks/useCompanyDashboard";
import { useCompanyBranding } from "@/context/CompanyBrandingContext";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const CompanyDashboard = () => {
  const [timeFilter, setTimeFilter] = useState('month');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { metrics, recentActivity, isLoading, refetch } = useCompanyDashboard();
  const { branding } = useCompanyBranding();
  const navigate = useNavigate();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  // Traitement des données mensuelles réelles
  const monthlyData = metrics?.monthly_data?.map(month => ({
    month: month.month_name,
    ca: Number(month.revenue),
    achats: Number(month.purchases),
    marge: Number(month.margin),
    margePercent: Number(month.margin_percentage)
  })) || [];

  const totals = {
    ca: monthlyData.reduce((sum, month) => sum + month.ca, 0),
    achats: monthlyData.reduce((sum, month) => sum + month.achats, 0),
    marge: monthlyData.reduce((sum, month) => sum + month.marge, 0),
  };

  const moyennes = {
    ca: monthlyData.length ? totals.ca / monthlyData.length : 0,
    achats: monthlyData.length ? totals.achats / monthlyData.length : 0,
    marge: monthlyData.length ? totals.marge / monthlyData.length : 0,
    margePercent: totals.ca > 0 ? (totals.marge / totals.ca) * 100 : 0
  };

  // Traitement des statistiques par statut
  const contractStats = metrics?.contract_stats || [];
  const realizedStats = contractStats.find(stat => stat.status === 'realized');
  const pendingStats = contractStats.find(stat => stat.status === 'pending');
  const refusedStats = contractStats.find(stat => stat.status === 'refused');
  const directSalesStats = contractStats.find(stat => stat.status === 'direct_sales');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-muted rounded animate-pulse" />
            <div className="h-4 w-96 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-32 bg-muted rounded animate-pulse" />
            <div className="h-10 w-24 bg-muted rounded animate-pulse" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <div className="h-8 w-48 m-6 mb-4 bg-muted rounded animate-pulse" />
              <div className="p-6 pt-0">
                <div className="h-64 w-full bg-muted rounded animate-pulse" />
              </div>
            </Card>
          </div>
          <div className="space-y-4">
            <Card>
              <div className="h-6 w-32 m-6 mb-4 bg-muted rounded animate-pulse" />
              <div className="p-6 pt-0 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 w-full bg-muted rounded animate-pulse" />
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/5 p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 p-6 border border-primary/20">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Dashboard Financier 2025
              </h1>
              <p className="text-muted-foreground">
                Performance et analytics de votre activité leasing
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-36 border-primary/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Mois</SelectItem>
                  <SelectItem value="quarter">Trimestre</SelectItem>
                  <SelectItem value="year">Année</SelectItem>
                  <SelectItem value="all">Tout</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                className="border-primary/20 hover:bg-primary/10"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
                Rafraîchir
              </Button>
              <Button variant="outline" className="border-primary/20 hover:bg-primary/10">
                <Download className="w-4 h-4 mr-2" />
                Exporter PDF
              </Button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">CA Total</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(totals.ca)}</p>
                </div>
                <div className="p-2 rounded-full bg-green-500/20">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Achats Total</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(totals.achats)}</p>
                </div>
                <div className="p-2 rounded-full bg-blue-500/20">
                  <HandshakeIcon className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Marge Brute</p>
                  <p className="text-xl font-bold text-emerald-600">{formatCurrency(totals.marge)}</p>
                </div>
                <div className="p-2 rounded-full bg-emerald-500/20">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Taux de Marge</p>
                  <p className="text-xl font-bold text-purple-600">{moyennes.margePercent.toFixed(2)}%</p>
                </div>
                <div className="p-2 rounded-full bg-purple-500/20">
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Table */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Tableau Mensuel 2025</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-hidden rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary/5">
                        <TableHead className="font-bold">Mois</TableHead>
                        <TableHead className="text-right font-bold">CA leasing (€)</TableHead>
                        <TableHead className="text-right font-bold">Achats (€)</TableHead>
                        <TableHead className="text-right font-bold">Marge brute (€)</TableHead>
                        <TableHead className="text-right font-bold">Marge (%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyData.length > 0 ? (
                        monthlyData.map((month, index) => (
                          <TableRow 
                            key={month.month} 
                            className={`hover:bg-primary/5 ${index % 2 === 0 ? "bg-background" : "bg-muted/30"}`}
                          >
                            <TableCell className="font-semibold">{month.month}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(month.ca)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(month.achats)}</TableCell>
                            <TableCell className="text-right font-bold text-green-600">{formatCurrency(month.marge)}</TableCell>
                            <TableCell className="text-right font-bold text-green-600">{Number(month.margePercent).toFixed(1)}%</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <Activity className="w-8 h-8 opacity-50" />
                              <span>Aucune donnée disponible pour cette période</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow className="bg-green-50 dark:bg-green-900/10 border-t-2 border-green-200">
                        <TableCell className="font-bold text-lg">TOTAL</TableCell>
                        <TableCell className="text-right font-bold text-lg">{formatCurrency(totals.ca)}</TableCell>
                        <TableCell className="text-right font-bold text-lg">{formatCurrency(totals.achats)}</TableCell>
                        <TableCell className="text-right font-bold text-lg text-green-600">{formatCurrency(totals.marge)}</TableCell>
                        <TableCell className="text-right font-bold text-lg text-green-600">{moyennes.margePercent.toFixed(1)}%</TableCell>
                      </TableRow>
                      <TableRow className="bg-blue-50 dark:bg-blue-900/10 border-b-2 border-blue-200">
                        <TableCell className="font-bold">MOYENNE</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(moyennes.ca)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(moyennes.achats)}</TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">{formatCurrency(moyennes.marge)}</TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">{moyennes.margePercent.toFixed(1)}%</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Statistics Sidebar */}
          <div className="space-y-4">
            {/* Contrats réalisés */}
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Contrats Réalisés
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-green-500/10">
                    <p className="text-xs text-muted-foreground">Nombre</p>
                    <p className="text-xl font-bold text-green-600">{realizedStats?.count || 0}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-green-500/10">
                    <p className="text-xs text-muted-foreground">Marge</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(Number(realizedStats?.total_margin || 0))}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Montant CA</span>
                    <span className="font-semibold">{formatCurrency(Number(realizedStats?.total_revenue || 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Achats</span>
                    <span className="font-semibold">{formatCurrency(Number(realizedStats?.total_purchases || 0))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contrats en attente */}
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  En Attente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-orange-500/10">
                    <p className="text-xs text-muted-foreground">Nombre</p>
                    <p className="text-xl font-bold text-orange-600">{pendingStats?.count || 0}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-orange-500/10">
                    <p className="text-xs text-muted-foreground">Potentiel</p>
                    <p className="text-lg font-bold text-orange-600">{formatCurrency(Number(pendingStats?.total_margin || 0))}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Montant potentiel</span>
                    <span className="font-semibold">{formatCurrency(Number(pendingStats?.total_revenue || 0))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contrats refusés */}
            <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Target className="w-5 h-5 text-red-600" />
                  Refusés/Sans Suite
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-red-500/10">
                    <p className="text-xs text-muted-foreground">Nombre</p>
                    <p className="text-xl font-bold text-red-600">{refusedStats?.count || 0}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-red-500/10">
                    <p className="text-xs text-muted-foreground">Perdu</p>
                    <p className="text-lg font-bold text-red-600">{formatCurrency(Number(refusedStats?.total_margin || 0))}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Montant perdu</span>
                    <span className="font-semibold">{formatCurrency(Number(refusedStats?.total_revenue || 0))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ventes Directes */}
            <Card className="bg-gradient-to-br from-cyan-50 to-teal-100 dark:from-cyan-900/20 dark:to-teal-800/20 border-cyan-200/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-cyan-600" />
                  Ventes Directes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-cyan-500/10">
                    <p className="text-xs text-muted-foreground">Factures</p>
                    <p className="text-xl font-bold text-cyan-600">{directSalesStats?.count || 0}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-cyan-500/10">
                    <p className="text-xs text-muted-foreground">Marge</p>
                    <p className="text-lg font-bold text-cyan-600">{formatCurrency(Number(directSalesStats?.total_margin || 0))}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>CA total</span>
                    <span className="font-semibold">{formatCurrency(Number(directSalesStats?.total_revenue || 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Achats</span>
                    <span className="font-semibold">{formatCurrency(Number(directSalesStats?.total_purchases || 0))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Prévisionnel */}
            <Card className="bg-gradient-to-br from-indigo-50 to-violet-100 dark:from-indigo-900/20 dark:to-violet-800/20 border-indigo-200/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  Prévisionnel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-indigo-500/10">
                    <p className="text-xs text-muted-foreground">Nombre total</p>
                    <p className="text-xl font-bold text-indigo-600">
                      {(realizedStats?.count || 0) + (pendingStats?.count || 0) + (directSalesStats?.count || 0)}
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-indigo-500/10">
                    <p className="text-xs text-muted-foreground">Marge prévue</p>
                    <p className="text-lg font-bold text-indigo-600">
                      {formatCurrency(Number(realizedStats?.total_margin || 0) + Number(pendingStats?.total_margin || 0) + Number(directSalesStats?.total_margin || 0))}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>CA prévisionnel</span>
                    <span className="font-semibold">
                      {formatCurrency(Number(realizedStats?.total_revenue || 0) + Number(pendingStats?.total_revenue || 0) + Number(directSalesStats?.total_revenue || 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Achats prévus</span>
                    <span className="font-semibold">
                      {formatCurrency(Number(realizedStats?.total_purchases || 0) + Number(pendingStats?.total_purchases || 0) + Number(directSalesStats?.total_purchases || 0))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions rapides */}
            <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold">Actions Rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start hover:bg-primary/10"
                  onClick={() => navigate('/itakecare/admin/clients')}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Nouveau Client
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start hover:bg-primary/10"
                  onClick={() => navigate('/itakecare/admin/offers')}
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Créer une Offre
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start hover:bg-primary/10"
                  onClick={() => navigate('/itakecare/admin/contracts')}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Voir les Contrats
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start hover:bg-primary/10"
                  onClick={() => navigate('/itakecare/admin/reports')}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Rapports Détaillés
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDashboard;