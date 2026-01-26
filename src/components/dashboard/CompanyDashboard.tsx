import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
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
  ShoppingBag,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCompanyDashboard } from "@/hooks/useCompanyDashboard";
import { useCompanyBranding } from "@/context/CompanyBrandingContext";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const CompanyDashboard = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [timeFilter, setTimeFilter] = useState('month');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [includeCreditNotes, setIncludeCreditNotes] = useState(false);
  const { metrics, recentActivity, overdueInvoices, isLoading, refetch } = useCompanyDashboard(selectedYear);
  const { branding } = useCompanyBranding();
  const navigate = useNavigate();
  
  // Générer les années disponibles (de 2022 à année courante)
  const availableYears = Array.from({ length: currentYear - 2021 }, (_, i) => 2022 + i);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  // Traitement des données mensuelles réelles
  // La fonction SQL renvoie directement le CA BRUT des factures (revenue = leasing, direct_sales_revenue = ventes)
  // Les notes de crédit sont séparées et déjà déduites dans le calcul de la marge
  const monthlyData = metrics?.monthly_data?.map(month => {
    const creditNotes = Number(month.credit_notes_amount || 0);
    const revenueLeasing = Number(month.revenue || 0);  // CA leasing (factures leasing)
    const directSales = Number(month.direct_sales_revenue || 0);  // CA ventes directes
    
    return {
      month: month.month_name,
      ca: revenueLeasing + directSales,  // CA brut = leasing + ventes directes
      directSales: directSales,
      achats: Number(month.purchases),
      marge: Number(month.margin),
      margePercent: Number(month.margin_percentage),
      creditNotes: creditNotes
    };
  }) || [];

  const totalCreditNotes = monthlyData.reduce((sum, m) => sum + m.creditNotes, 0);

  const totals = {
    ca: monthlyData.reduce((sum, month) => sum + month.ca, 0),
    directSales: monthlyData.reduce((sum, month) => sum + month.directSales, 0),
    achats: monthlyData.reduce((sum, month) => sum + month.achats, 0),
    marge: monthlyData.reduce((sum, month) => sum + month.marge, 0) + (includeCreditNotes ? totalCreditNotes : 0),
    creditNotes: totalCreditNotes,
  };

  const moyennes = {
    ca: monthlyData.length ? totals.ca / monthlyData.length : 0,
    directSales: monthlyData.length ? totals.directSales / monthlyData.length : 0,
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
    <div className="min-h-screen bg-background p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-medium text-foreground">
              Dashboard Financier {selectedYear}
            </h1>
            <p className="text-xs text-muted-foreground">
              Performance et analytics de votre activité leasing
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
              <SelectTrigger className="w-28">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-36">
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
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
              Rafraîchir
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exporter PDF
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-normal text-muted-foreground">CA Total</p>
                  <p className="text-xl font-medium text-foreground">{formatCurrency(totals.ca)}</p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-normal text-muted-foreground">Achats Total</p>
                  <p className="text-xl font-medium text-foreground">{formatCurrency(totals.achats)}</p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10">
                  <HandshakeIcon className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-normal text-muted-foreground">
                    Marge Brute {includeCreditNotes && <span className="text-primary">(net)</span>}
                  </p>
                  <p className="text-xl font-medium text-foreground">{formatCurrency(totals.marge)}</p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-normal text-muted-foreground">Taux de Marge</p>
                  <p className="text-xl font-medium text-foreground">{moyennes.margePercent.toFixed(2)}%</p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Table + Factures en retard + Actions Rapides */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Tableau Mensuel {selectedYear}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-hidden rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary/5">
                        <TableHead className="font-medium text-xs">Mois</TableHead>
                        <TableHead className="text-right font-medium text-xs">CA mensuel (€)</TableHead>
                        <TableHead className="text-right font-medium text-xs text-purple-600">
                          <div className="flex items-center justify-end gap-2">
                            <span>Notes de crédit (€)</span>
                            <div className="flex items-center gap-1">
                              <Checkbox 
                                id="includeCreditNotes"
                                checked={includeCreditNotes}
                                onCheckedChange={(checked) => setIncludeCreditNotes(checked === true)}
                                className="h-4 w-4"
                              />
                              <label 
                                htmlFor="includeCreditNotes" 
                                className="text-xs font-normal cursor-pointer"
                                title="Déduire les notes de crédit du CA et de la marge"
                              >
                                Déduire
                              </label>
                            </div>
                          </div>
                        </TableHead>
                        <TableHead className="text-right font-medium text-xs">Achats (€)</TableHead>
                        <TableHead className="text-right font-medium text-xs">Marge brute (€)</TableHead>
                        <TableHead className="text-right font-medium text-xs">Marge (%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyData.length > 0 ? (
                        monthlyData.map((month, index) => (
                          <TableRow 
                            key={month.month} 
                            className={`hover:bg-primary/5 ${index % 2 === 0 ? "bg-background" : "bg-muted/30"}`}
                          >
                            <TableCell className="font-normal">{month.month}</TableCell>
                            <TableCell className="text-right font-normal">{formatCurrency(month.ca)}</TableCell>
                            <TableCell className="text-right font-normal text-purple-600">
                              {month.creditNotes > 0 ? `-${formatCurrency(month.creditNotes)}` : '-'}
                            </TableCell>
                            <TableCell className="text-right font-normal">{formatCurrency(month.achats)}</TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              {formatCurrency(month.marge + (includeCreditNotes ? month.creditNotes : 0))}
                            </TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              {month.ca > 0 
                                ? (((month.marge + (includeCreditNotes ? month.creditNotes : 0)) / month.ca) * 100).toFixed(1)
                                : '0.0'}%
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <Activity className="w-8 h-8 opacity-50" />
                              <span>Aucune donnée disponible pour cette période</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow className="bg-green-50 dark:bg-green-900/10 border-t-2 border-green-200">
                        <TableCell className="font-medium text-base">TOTAL</TableCell>
                        <TableCell className="text-right font-medium text-base">{formatCurrency(totals.ca)}</TableCell>
                        <TableCell className="text-right font-medium text-base text-purple-600">
                          {monthlyData.reduce((sum, m) => sum + m.creditNotes, 0) > 0 
                            ? `-${formatCurrency(monthlyData.reduce((sum, m) => sum + m.creditNotes, 0))}` 
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium text-base">{formatCurrency(totals.achats)}</TableCell>
                        <TableCell className="text-right font-medium text-base text-green-600">{formatCurrency(totals.marge)}</TableCell>
                        <TableCell className="text-right font-medium text-base text-green-600">{moyennes.margePercent.toFixed(1)}%</TableCell>
                      </TableRow>
                      <TableRow className="bg-blue-50 dark:bg-blue-900/10 border-b-2 border-blue-200">
                        <TableCell className="font-medium">MOYENNE</TableCell>
                        <TableCell className="text-right font-normal">{formatCurrency(moyennes.ca)}</TableCell>
                        <TableCell className="text-right font-normal text-purple-600">-</TableCell>
                        <TableCell className="text-right font-normal">{formatCurrency(moyennes.achats)}</TableCell>
                        <TableCell className="text-right font-normal text-blue-600">{formatCurrency(moyennes.marge)}</TableCell>
                        <TableCell className="text-right font-normal text-blue-600">{moyennes.margePercent.toFixed(1)}%</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Factures en retard */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Factures en attente de paiement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Nombre</p>
                    <p className="text-xl font-bold text-foreground">{overdueInvoices.overdue_count}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Montant dû</p>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(overdueInvoices.overdue_amount)}</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => navigate('/itakecare/admin/invoicing')}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Voir les factures
                </Button>
              </CardContent>
            </Card>

          </div>

          {/* Statistics Sidebar */}
          <div className="space-y-4">
            {/* Contrats réalisés */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  Contrats Réalisés
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Nombre</p>
                    <p className="text-xl font-bold text-foreground">{realizedStats?.count || 0}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Marge</p>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(Number(realizedStats?.total_margin || 0))}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Montant CA</span>
                    <span className="font-semibold">{formatCurrency(Number(realizedStats?.total_revenue || 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Achats</span>
                    <span className="font-semibold">{formatCurrency(Number(realizedStats?.total_purchases || 0))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contrats en attente */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-500" />
                  En Attente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Nombre</p>
                    <p className="text-xl font-bold text-foreground">{pendingStats?.count || 0}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Marge potentielle</p>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(Number(pendingStats?.total_margin || 0))}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Achats</span>
                    <span className="font-semibold">{formatCurrency(Number(pendingStats?.total_purchases || 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CA potentiel</span>
                    <span className="font-semibold">{formatCurrency(Number(pendingStats?.total_revenue || 0))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contrats refusés */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-rose-500" />
                  Refusés/Sans Suite
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Nombre</p>
                    <p className="text-xl font-bold text-foreground">{refusedStats?.count || 0}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Marge perdue</p>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(Number(refusedStats?.total_margin || 0))}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CA perdu</span>
                    <span className="font-semibold">{formatCurrency(Number(refusedStats?.total_revenue || 0))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ventes Directes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                  Ventes Directes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Factures</p>
                    <p className="text-xl font-bold text-foreground">{directSalesStats?.count || 0}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Marge</p>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(Number(directSalesStats?.total_margin || 0))}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CA total</span>
                    <span className="font-semibold">{formatCurrency(Number(directSalesStats?.total_revenue || 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Achats</span>
                    <span className="font-semibold">{formatCurrency(Number(directSalesStats?.total_purchases || 0))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Prévisionnel */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Prévisionnel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Nombre total</p>
                    <p className="text-xl font-bold text-foreground">
                      {(realizedStats?.count || 0) + (pendingStats?.count || 0) + (directSalesStats?.count || 0)}
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Marge prévue</p>
                    <p className="text-lg font-bold text-foreground">
                      {formatCurrency(Number(realizedStats?.total_margin || 0) + Number(pendingStats?.total_margin || 0) + Number(directSalesStats?.total_margin || 0))}
                      {(() => {
                        const totalPurchases = Number(realizedStats?.total_purchases || 0) + Number(pendingStats?.total_purchases || 0) + Number(directSalesStats?.total_purchases || 0);
                        const totalMargin = Number(realizedStats?.total_margin || 0) + Number(pendingStats?.total_margin || 0) + Number(directSalesStats?.total_margin || 0);
                        const marginPercent = totalPurchases > 0 ? (totalMargin / totalPurchases) * 100 : 0;
                        return <span className="text-xs ml-1 opacity-75">({marginPercent.toFixed(1)}%)</span>;
                      })()}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CA prévisionnel</span>
                    <span className="font-semibold">
                      {formatCurrency(Number(realizedStats?.total_revenue || 0) + Number(pendingStats?.total_revenue || 0) + Number(directSalesStats?.total_revenue || 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Achats prévus</span>
                    <span className="font-semibold">
                      {formatCurrency(Number(realizedStats?.total_purchases || 0) + Number(pendingStats?.total_purchases || 0) + Number(directSalesStats?.total_purchases || 0))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDashboard;