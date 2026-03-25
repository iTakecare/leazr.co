import React, { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import DashboardPDFExportModal from "./DashboardPDFExportModal";
import type { PDFYearData } from "./DashboardPDFContent";

const CompanyDashboard = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [timeFilter, setTimeFilter] = useState('month');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [includeCreditNotes, setIncludeCreditNotes] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const { metrics, recentActivity, overdueInvoices, selfLeasingProjection, isLoading, refetch } = useCompanyDashboard(selectedYear);
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
    const selfLeasingRevenue = Number(month.self_leasing_revenue || 0);  // CA self-leasing
    
    return {
      month: month.month_name,
      ca: revenueLeasing + directSales + selfLeasingRevenue,  // CA brut total
      caLeasing: revenueLeasing,
      selfLeasing: selfLeasingRevenue,
      directSales: directSales,
      achats: Number(month.purchases),
      marge: Number(month.margin),
      margePercent: Number(month.margin_percentage),
      creditNotes: creditNotes
    };
  }) || [];

  const totalCreditNotes = monthlyData.reduce((sum, m) => sum + m.creditNotes, 0);

  const margeBase = monthlyData.reduce((sum, month) => sum + month.marge, 0);
  const rawCa = monthlyData.reduce((sum, month) => sum + month.ca, 0);
  const rawCaLeasing = monthlyData.reduce((sum, month) => sum + month.caLeasing, 0);
  const totals = {
    ca: includeCreditNotes ? rawCa - totalCreditNotes : rawCa,
    caLeasing: includeCreditNotes ? rawCaLeasing - totalCreditNotes : rawCaLeasing,
    selfLeasing: monthlyData.reduce((sum, month) => sum + month.selfLeasing, 0),
    directSales: monthlyData.reduce((sum, month) => sum + month.directSales, 0),
    achats: monthlyData.reduce((sum, month) => sum + month.achats, 0),
    marge: includeCreditNotes ? margeBase : margeBase + totalCreditNotes,
    creditNotes: totalCreditNotes,
  };

  // Pour la moyenne, ne prendre en compte que les mois écoulés + mois en cours
  const elapsedMonths = selectedYear < currentYear 
    ? 12 
    : Math.min(new Date().getMonth() + 1, monthlyData.length);
  
  // Calculer les moyennes uniquement sur les mois écoulés (les N premiers mois)
  const elapsedData = monthlyData.slice(0, elapsedMonths);
  const avgDivisor = Math.max(elapsedData.length, 1);

  const elapsedTotals = {
    ca: elapsedData.reduce((sum, m) => sum + m.ca, 0),
    caLeasing: elapsedData.reduce((sum, m) => sum + m.caLeasing, 0),
    selfLeasing: elapsedData.reduce((sum, m) => sum + m.selfLeasing, 0),
    directSales: elapsedData.reduce((sum, m) => sum + m.directSales, 0),
    achats: elapsedData.reduce((sum, m) => sum + m.achats, 0),
    marge: elapsedData.reduce((sum, m) => sum + m.marge, 0),
    creditNotes: elapsedData.reduce((sum, m) => sum + m.creditNotes, 0),
  };

  // Appliquer le même traitement credit notes que pour les totaux
  const avgCa = includeCreditNotes ? elapsedTotals.ca - elapsedTotals.creditNotes : elapsedTotals.ca;
  const avgCaLeasing = includeCreditNotes ? elapsedTotals.caLeasing - elapsedTotals.creditNotes : elapsedTotals.caLeasing;
  const avgMarge = includeCreditNotes ? elapsedTotals.marge : elapsedTotals.marge + elapsedTotals.creditNotes;

  const moyennes = {
    ca: avgCa / avgDivisor,
    caLeasing: avgCaLeasing / avgDivisor,
    selfLeasing: elapsedTotals.selfLeasing / avgDivisor,
    directSales: elapsedTotals.directSales / avgDivisor,
    achats: elapsedTotals.achats / avgDivisor,
    marge: avgMarge / avgDivisor,
    margePercent: avgCa > 0 ? (avgMarge / avgCa) * 100 : 0,
  };

  const isCurrentYear = selectedYear === currentYear;

  // Total affiché = mois écoulés pour l'année en cours, sinon total annuel complet
  const displayedTotals = isCurrentYear
    ? {
        ca: includeCreditNotes ? elapsedTotals.ca - elapsedTotals.creditNotes : elapsedTotals.ca,
        caLeasing: includeCreditNotes ? elapsedTotals.caLeasing - elapsedTotals.creditNotes : elapsedTotals.caLeasing,
        selfLeasing: elapsedTotals.selfLeasing,
        directSales: elapsedTotals.directSales,
        achats: elapsedTotals.achats,
        marge: includeCreditNotes ? elapsedTotals.marge : elapsedTotals.marge + elapsedTotals.creditNotes,
        creditNotes: elapsedTotals.creditNotes,
      }
    : totals;

  const totalMarginPercent = displayedTotals.ca > 0 ? (displayedTotals.marge / displayedTotals.ca) * 100 : 0;

  // Prévisionnel = total affiché + revenus self-leasing connus pour les mois restants
  const previsionnel = {
    ca: displayedTotals.ca + (selfLeasingProjection?.futureRevenue || 0),
    caLeasing: displayedTotals.caLeasing,
    selfLeasing: displayedTotals.selfLeasing + (selfLeasingProjection?.futureRevenue || 0),
    directSales: displayedTotals.directSales,
    achats: displayedTotals.achats + (selfLeasingProjection?.futurePurchases || 0),
    marge: 0,
  };
  previsionnel.marge = previsionnel.ca - previsionnel.achats;
  const previsionnelMarginPercent = previsionnel.ca > 0 ? (previsionnel.marge / previsionnel.ca) * 100 : 0;

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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-muted rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-8 w-24 bg-muted rounded animate-pulse" />
            <div className="h-8 w-8 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-64 bg-muted rounded-lg animate-pulse" />
          <div className="h-64 bg-muted rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="space-y-4">
        {/* Header compact */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-lg font-semibold text-foreground">
            Dashboard Financier
          </h1>
          <div className="flex items-center gap-2">
            <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
              <SelectTrigger className="h-8 w-24 text-xs">
                <Calendar className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()} className="text-xs">{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Rafraîchir"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setShowPDFModal(true)} title="Exporter PDF">
              <Download className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="shadow-none">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">CA Total</p>
                  <p className="text-lg font-semibold">{formatCurrency(displayedTotals.ca)}</p>
                  {isCurrentYear && (
                    <p className="text-[11px] text-muted-foreground">Prév. {formatCurrency(previsionnel.ca)}</p>
                  )}
                </div>
                <div className="p-2 rounded-lg bg-blue-50">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Achats</p>
                  <p className="text-lg font-semibold">{formatCurrency(displayedTotals.achats)}</p>
                </div>
                <div className="p-2 rounded-lg bg-amber-50">
                  <HandshakeIcon className="w-4 h-4 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Marge Brute {includeCreditNotes && <span className="text-primary">(net)</span>}
                  </p>
                  <p className="text-lg font-semibold">{formatCurrency(displayedTotals.marge)}</p>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Taux de Marge</p>
                  <p className="text-lg font-semibold">{moyennes.margePercent.toFixed(2)}%</p>
                </div>
                <div className="p-2 rounded-lg bg-purple-50">
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Monthly Table + Factures en retard */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Tableau Mensuel {selectedYear}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-hidden rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="font-medium text-xs">Mois</TableHead>
                        <TableHead className="text-right font-medium text-xs">CA total (€)</TableHead>
                        <TableHead className="text-right font-medium text-xs text-blue-600">CA Leasing (€)</TableHead>
                        <TableHead className="text-right font-medium text-xs text-indigo-600">CA Self-Leasing (€)</TableHead>
                        <TableHead className="text-right font-medium text-xs text-green-600">CA Ventes Directes (€)</TableHead>
                        <TableHead className="text-right font-medium text-xs text-slate-600">
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
                            <TableCell className="text-right font-normal">{formatCurrency(includeCreditNotes ? month.ca - month.creditNotes : month.ca)}</TableCell>
                            <TableCell className="text-right font-normal text-blue-700">{formatCurrency(includeCreditNotes ? month.caLeasing - month.creditNotes : month.caLeasing)}</TableCell>
                            <TableCell className="text-right font-normal text-indigo-700">{formatCurrency(month.selfLeasing)}</TableCell>
                            <TableCell className="text-right font-normal text-green-700">{formatCurrency(month.directSales)}</TableCell>
                            <TableCell className="text-right font-normal text-slate-500">
                              {month.creditNotes > 0 ? `-${formatCurrency(month.creditNotes)}` : '-'}
                            </TableCell>
                            <TableCell className="text-right font-normal">{formatCurrency(month.achats)}</TableCell>
                            <TableCell className="text-right font-medium text-emerald-700">
                              {formatCurrency(includeCreditNotes ? month.marge : month.marge + month.creditNotes)}
                            </TableCell>
                            <TableCell className="text-right font-medium text-emerald-700">
                              {(() => {
                                const adjustedCa = includeCreditNotes ? month.ca - month.creditNotes : month.ca;
                                const adjustedMarge = includeCreditNotes ? month.marge : month.marge + month.creditNotes;
                                return adjustedCa > 0 ? ((adjustedMarge / adjustedCa) * 100).toFixed(1) : '0.0';
                              })()}%
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <Activity className="w-8 h-8 opacity-50" />
                              <span>Aucune donnée disponible pour cette période</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow className="bg-slate-100 dark:bg-slate-800/50 border-t-2 border-slate-300">
                        <TableCell className="font-medium text-base text-slate-900">TOTAL</TableCell>
                        <TableCell className="text-right font-medium text-base">
                          <div>{formatCurrency(displayedTotals.ca)}</div>
                          {isCurrentYear && (
                            <div className="text-xs font-normal text-muted-foreground">(Prév. : {formatCurrency(previsionnel.ca)})</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium text-base text-blue-700">
                          <div>{formatCurrency(displayedTotals.caLeasing)}</div>
                          {isCurrentYear && previsionnel.caLeasing !== displayedTotals.caLeasing && (
                            <div className="text-xs font-normal text-muted-foreground">(Prév. : {formatCurrency(previsionnel.caLeasing)})</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium text-base text-indigo-700">
                          <div>{formatCurrency(displayedTotals.selfLeasing)}</div>
                          {isCurrentYear && previsionnel.selfLeasing !== displayedTotals.selfLeasing && (
                            <div className="text-xs font-normal text-muted-foreground">(Prév. : {formatCurrency(previsionnel.selfLeasing)})</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium text-base text-green-700">
                          <div>{formatCurrency(displayedTotals.directSales)}</div>
                          {isCurrentYear && previsionnel.directSales !== displayedTotals.directSales && (
                            <div className="text-xs font-normal text-muted-foreground">(Prév. : {formatCurrency(previsionnel.directSales)})</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium text-base text-slate-500">
                          {displayedTotals.creditNotes > 0 ? `-${formatCurrency(displayedTotals.creditNotes)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium text-base">
                          <div>{formatCurrency(displayedTotals.achats)}</div>
                          {isCurrentYear && previsionnel.achats !== displayedTotals.achats && (
                            <div className="text-xs font-normal text-muted-foreground">(Prév. : {formatCurrency(previsionnel.achats)})</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium text-base text-emerald-700">
                          <div>{formatCurrency(displayedTotals.marge)}</div>
                          {isCurrentYear && previsionnel.marge !== displayedTotals.marge && (
                            <div className="text-xs font-normal text-muted-foreground">(Prév. : {formatCurrency(previsionnel.marge)})</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium text-base text-emerald-700">
                          <div>{totalMarginPercent.toFixed(1)}%</div>
                          {isCurrentYear && previsionnel.ca > 0 && previsionnel.marge !== displayedTotals.marge && (
                            <div className="text-xs font-normal text-muted-foreground">(Prév. : {previsionnelMarginPercent.toFixed(1)}%)</div>
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-slate-50 dark:bg-slate-800/30 border-b-2 border-slate-200">
                        <TableCell className="font-medium text-slate-600">MOYENNE</TableCell>
                        <TableCell className="text-right font-normal">{formatCurrency(moyennes.ca)}</TableCell>
                        <TableCell className="text-right font-normal text-blue-600">{formatCurrency(moyennes.caLeasing)}</TableCell>
                        <TableCell className="text-right font-normal text-indigo-600">{formatCurrency(moyennes.selfLeasing)}</TableCell>
                        <TableCell className="text-right font-normal text-green-600">{formatCurrency(moyennes.directSales)}</TableCell>
                        <TableCell className="text-right font-normal text-slate-500">-</TableCell>
                        <TableCell className="text-right font-normal">{formatCurrency(moyennes.achats)}</TableCell>
                        <TableCell className="text-right font-normal text-slate-600">{formatCurrency(moyennes.marge)}</TableCell>
                        <TableCell className="text-right font-normal text-slate-600">{moyennes.margePercent.toFixed(1)}%</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Factures en retard */}
            {overdueInvoices.overdue_count > 0 && (
              <Card className="shadow-none border-orange-200 bg-orange-50/40">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      <div>
                        <p className="text-xs font-medium text-foreground">Factures en attente</p>
                        <p className="text-xs text-muted-foreground">{overdueInvoices.overdue_count} · {formatCurrency(overdueInvoices.overdue_amount)}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                      onClick={() => navigate('/itakecare/admin/invoicing')}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Voir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>

          {/* Sidebar — carte consolidée */}
          <div className="space-y-3">
            <Card className="shadow-none">
              <CardContent className="p-0 divide-y divide-border">

                {/* Réalisés */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      Contrats réalisés
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-lg font-bold text-foreground cursor-help">{realizedStats?.count || 0}</span>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs">
                          <p>{realizedStats?.leasing_count || 0} leasing · {realizedStats?.self_leasing_count || 0} self-leasing</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground">
                    <span>CA</span><span className="text-right font-medium text-foreground">{formatCurrency(Number(realizedStats?.total_revenue || 0))}</span>
                    <span>Achats</span><span className="text-right font-medium text-foreground">{formatCurrency(Number(realizedStats?.total_purchases || 0))}</span>
                    <span>Marge</span><span className="text-right font-semibold text-emerald-600">{formatCurrency(Number(realizedStats?.total_margin || 0))}</span>
                  </div>
                </div>

                {/* En attente */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      En attente
                    </div>
                    <span className="text-lg font-bold text-foreground">{pendingStats?.count || 0}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground">
                    <span>CA potentiel</span><span className="text-right font-medium text-foreground">{formatCurrency(Number(pendingStats?.total_revenue || 0))}</span>
                    <span>Marge pot.</span><span className="text-right font-semibold text-amber-600">{formatCurrency(Number(pendingStats?.total_margin || 0))}</span>
                  </div>
                </div>

                {/* Ventes directes */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <ShoppingBag className="w-3.5 h-3.5 text-cyan-500" />
                      Ventes directes
                    </div>
                    <span className="text-lg font-bold text-foreground">{directSalesStats?.count || 0}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground">
                    <span>CA</span><span className="text-right font-medium text-foreground">{formatCurrency(Number(directSalesStats?.total_revenue || 0))}</span>
                    <span>Marge</span><span className="text-right font-semibold text-cyan-600">{formatCurrency(Number(directSalesStats?.total_margin || 0))}</span>
                  </div>
                </div>

                {/* Refusés */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <Target className="w-3.5 h-3.5 text-rose-400" />
                      Refusés / Sans suite
                    </div>
                    <span className="text-lg font-bold text-foreground">{refusedStats?.count || 0}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground">
                    <span>CA perdu</span><span className="text-right font-medium text-foreground">{formatCurrency(Number(refusedStats?.total_revenue || 0))}</span>
                    <span>Marge perdue</span><span className="text-right font-semibold text-rose-500">{formatCurrency(Number(refusedStats?.total_margin || 0))}</span>
                  </div>
                </div>

                {/* Prévisionnel */}
                <div className="p-4 bg-muted/30 rounded-b-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                      Prévisionnel total
                    </div>
                    <span className="text-lg font-bold text-foreground">
                      {(realizedStats?.count || 0) + (pendingStats?.count || 0) + (directSalesStats?.count || 0)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground">
                    <span>CA prévu</span>
                    <span className="text-right font-medium text-foreground">
                      {formatCurrency(Number(realizedStats?.total_revenue || 0) + Number(pendingStats?.total_revenue || 0) + Number(directSalesStats?.total_revenue || 0))}
                    </span>
                    <span>Marge prévue</span>
                    <span className="text-right font-semibold text-indigo-600">
                      {formatCurrency(Number(realizedStats?.total_margin || 0) + Number(pendingStats?.total_margin || 0) + Number(directSalesStats?.total_margin || 0))}
                    </span>
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* PDF Export Modal */}
      <DashboardPDFExportModal
        open={showPDFModal}
        onOpenChange={setShowPDFModal}
        primaryYearData={{
          year: selectedYear,
          monthlyData,
          totals,
          moyennes,
          contractStats: {
            realized: realizedStats ? { status: 'realized', count: realizedStats.count || 0, total_revenue: Number(realizedStats.total_revenue || 0), total_purchases: Number(realizedStats.total_purchases || 0), total_margin: Number(realizedStats.total_margin || 0) } : undefined,
            pending: pendingStats ? { status: 'pending', count: pendingStats.count || 0, total_revenue: Number(pendingStats.total_revenue || 0), total_purchases: Number(pendingStats.total_purchases || 0), total_margin: Number(pendingStats.total_margin || 0) } : undefined,
            refused: refusedStats ? { status: 'refused', count: refusedStats.count || 0, total_revenue: Number(refusedStats.total_revenue || 0), total_purchases: Number(refusedStats.total_purchases || 0), total_margin: Number(refusedStats.total_margin || 0) } : undefined,
            directSales: directSalesStats ? { status: 'direct_sales', count: directSalesStats.count || 0, total_revenue: Number(directSalesStats.total_revenue || 0), total_purchases: Number(directSalesStats.total_purchases || 0), total_margin: Number(directSalesStats.total_margin || 0) } : undefined,
          },
          overdueInvoices: overdueInvoices || { overdue_count: 0, overdue_amount: 0 },
        }}
        availableYears={availableYears}
        selectedYear={selectedYear}
      />
    </div>
  );
};

export default CompanyDashboard;