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
  CheckCircle
} from "lucide-react";
import { useCompanyDashboard } from "@/hooks/useCompanyDashboard";
import { useCompanyBranding } from "@/context/CompanyBrandingContext";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const CompanyDashboard = () => {
  const [timeFilter, setTimeFilter] = useState('month');
  const { metrics, recentActivity, isLoading } = useCompanyDashboard();
  const { branding } = useCompanyBranding();
  const navigate = useNavigate();

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
    ca: monthlyData.length ? Math.round(totals.ca / monthlyData.length) : 0,
    achats: monthlyData.length ? Math.round(totals.achats / monthlyData.length) : 0,
    marge: monthlyData.length ? Math.round(totals.marge / monthlyData.length) : 0,
    margePercent: totals.ca > 0 ? Math.round((totals.marge / totals.ca) * 1000) / 10 : 0
  };

  // Traitement des statistiques par statut
  const contractStats = metrics?.contract_stats || [];
  const realizedStats = contractStats.find(stat => stat.status === 'realized');
  const pendingStats = contractStats.find(stat => stat.status === 'pending');
  const refusedStats = contractStats.find(stat => stat.status === 'refused');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Rapport financier 2025</h1>
          <p className="text-muted-foreground">
            Détail des performances mensuelles de leasing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mois</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Année</SelectItem>
              <SelectItem value="all">Tout</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exporter PDF
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Table - 2/3 width */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Tableau mensuel 2025</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Mois</TableHead>
                    <TableHead className="text-right font-semibold">CA leasing (€)</TableHead>
                    <TableHead className="text-right font-semibold">Achats (€)</TableHead>
                    <TableHead className="text-right font-semibold">Marge brute leasing (€)</TableHead>
                    <TableHead className="text-right font-semibold">Marge brute (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyData.length > 0 ? (
                    monthlyData.map((month, index) => (
                      <TableRow key={month.month} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                        <TableCell className="font-medium">{month.month}</TableCell>
                        <TableCell className="text-right">{formatCurrency(month.ca)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(month.achats)}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">{formatCurrency(month.marge)}</TableCell>
                        <TableCell className="text-right font-medium">{month.margePercent}%</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Aucune donnée disponible pour cette période
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow className="bg-muted border-t-2 font-semibold">
                    <TableCell className="font-bold">TOTAL</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(totals.ca)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(totals.achats)}</TableCell>
                    <TableCell className="text-right font-bold text-green-600">{formatCurrency(totals.marge)}</TableCell>
                    <TableCell className="text-right font-bold">{moyennes.margePercent}%</TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/50 border-b-2 font-medium">
                    <TableCell className="font-semibold">MOYENNE</TableCell>
                    <TableCell className="text-right">{formatCurrency(moyennes.ca)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(moyennes.achats)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(moyennes.marge)}</TableCell>
                    <TableCell className="text-right">{moyennes.margePercent}%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Statistics Sidebar - 1/3 width */}
        <div className="space-y-4">
          {/* Statistiques 2025 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Statistiques 2025</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-1 border-b border-muted">
                <span className="text-sm text-muted-foreground">CA total</span>
                <span className="font-semibold">{formatCurrency(totals.ca)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-muted">
                <span className="text-sm text-muted-foreground">Achats total</span>
                <span className="font-semibold">{formatCurrency(totals.achats)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-muted">
                <span className="text-sm text-muted-foreground">Marge brute</span>
                <span className="font-semibold text-green-600">{formatCurrency(totals.marge)}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-muted-foreground">Taux de marge</span>
                <span className="font-semibold">{moyennes.margePercent}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Contrats réalisés */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Contrats réalisés
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-1 border-b border-muted">
                <span className="text-sm text-muted-foreground">Nombre</span>
                <Badge variant="secondary">{metrics?.total_contracts || 0}</Badge>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-muted">
                <span className="text-sm text-muted-foreground">Montant CA</span>
                <span className="font-medium">{formatCurrency(Number(realizedStats?.total_revenue || 0))}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-muted">
                <span className="text-sm text-muted-foreground">Achats</span>
                <span className="font-medium">{formatCurrency(Number(realizedStats?.total_purchases || 0))}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-muted-foreground">Marge</span>
                <span className="font-medium text-green-600">{formatCurrency(Number(realizedStats?.total_margin || 0))}</span>
              </div>
            </CardContent>
          </Card>

          {/* Contrats en attente */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                Contrats en attente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-1 border-b border-muted">
                <span className="text-sm text-muted-foreground">Nombre</span>
                <Badge variant="outline">{metrics?.pending_offers || 0}</Badge>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-muted">
                <span className="text-sm text-muted-foreground">Montant potentiel</span>
                <span className="font-medium">{formatCurrency(Number(pendingStats?.total_revenue || 0))}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-muted-foreground">Marge potentielle</span>
                <span className="font-medium text-orange-500">{formatCurrency(Number(pendingStats?.total_margin || 0))}</span>
              </div>
            </CardContent>
          </Card>

          {/* Contrats refusés */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Target className="w-4 h-4 text-red-500" />
                Contrats refusés/sans suite
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-1 border-b border-muted">
                <span className="text-sm text-muted-foreground">Nombre</span>
                <Badge variant="destructive">{refusedStats?.count || 0}</Badge>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-muted">
                <span className="text-sm text-muted-foreground">Montant perdu</span>
                <span className="font-medium text-red-500">{formatCurrency(Number(refusedStats?.total_revenue || 0))}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-muted-foreground">Marge perdue</span>
                <span className="font-medium text-red-500">{formatCurrency(Number(refusedStats?.total_margin || 0))}</span>
              </div>
            </CardContent>
          </Card>

          {/* Actions rapides */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => navigate('/itakecare/admin/clients')}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Nouveau client
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => navigate('/itakecare/admin/offers')}
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Créer une offre
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => navigate('/itakecare/admin/contracts')}
              >
                <Eye className="w-4 h-4 mr-2" />
                Voir les contrats
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => navigate('/itakecare/admin/reports')}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Rapports détaillés
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CompanyDashboard;