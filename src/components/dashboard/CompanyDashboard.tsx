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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
      <div className="p-8 space-y-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 p-8 border border-primary/20 backdrop-blur-sm"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-30" />
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Dashboard Financier 2025
              </h1>
              <p className="text-lg text-muted-foreground">
                Performance et analytics de votre activité leasing
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-40 h-11 border-primary/20 bg-background/80 backdrop-blur-sm">
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
                size="lg"
                className="h-11 border-primary/20 bg-background/80 backdrop-blur-sm hover:bg-primary/10 hover:border-primary/40 transition-all duration-300"
              >
                <Download className="w-4 h-4 mr-2" />
                Exporter PDF
              </Button>
            </div>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-sm shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-transparent opacity-50" />
            <CardContent className="relative z-10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">CA Total</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.ca)}</p>
                </div>
                <div className="p-3 rounded-full bg-green-500/20">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-sm shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent opacity-50" />
            <CardContent className="relative z-10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Achats Total</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(totals.achats)}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-500/20">
                  <HandshakeIcon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 backdrop-blur-sm shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent opacity-50" />
            <CardContent className="relative z-10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Marge Brute</p>
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totals.marge)}</p>
                </div>
                <div className="p-3 rounded-full bg-emerald-500/20">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5 backdrop-blur-sm shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent opacity-50" />
            <CardContent className="relative z-10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Taux de Marge</p>
                  <p className="text-2xl font-bold text-purple-600">{moyennes.margePercent}%</p>
                </div>
                <div className="p-3 rounded-full bg-purple-500/20">
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Monthly Table - 2/3 width */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="lg:col-span-2"
          >
            <Card className="border-0 shadow-xl bg-gradient-to-br from-background to-secondary/5 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                  Tableau Mensuel 2025
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-hidden rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-primary/10 to-accent/10 border-0">
                        <TableHead className="font-bold text-foreground/90">Mois</TableHead>
                        <TableHead className="text-right font-bold text-foreground/90">CA leasing (€)</TableHead>
                        <TableHead className="text-right font-bold text-foreground/90">Achats (€)</TableHead>
                        <TableHead className="text-right font-bold text-foreground/90">Marge brute (€)</TableHead>
                        <TableHead className="text-right font-bold text-foreground/90">Marge (%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyData.length > 0 ? (
                        monthlyData.map((month, index) => (
                          <TableRow 
                            key={month.month} 
                            className={`border-0 hover:bg-primary/5 transition-colors duration-200 ${
                              index % 2 === 0 ? "bg-background/50" : "bg-secondary/10"
                            }`}
                          >
                            <TableCell className="font-semibold text-foreground/90">{month.month}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(month.ca)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(month.achats)}</TableCell>
                            <TableCell className="text-right font-bold text-green-600">{formatCurrency(month.marge)}</TableCell>
                            <TableCell className="text-right font-bold text-green-600">{month.margePercent}%</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <Activity className="w-8 h-8 opacity-50" />
                              <span>Aucune donnée disponible pour cette période</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-t-2 border-green-500/30">
                        <TableCell className="font-bold text-lg">TOTAL</TableCell>
                        <TableCell className="text-right font-bold text-lg">{formatCurrency(totals.ca)}</TableCell>
                        <TableCell className="text-right font-bold text-lg">{formatCurrency(totals.achats)}</TableCell>
                        <TableCell className="text-right font-bold text-lg text-green-600">{formatCurrency(totals.marge)}</TableCell>
                        <TableCell className="text-right font-bold text-lg text-green-600">{moyennes.margePercent}%</TableCell>
                      </TableRow>
                      <TableRow className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-b-2 border-blue-500/30">
                        <TableCell className="font-bold">MOYENNE</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(moyennes.ca)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(moyennes.achats)}</TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">{formatCurrency(moyennes.marge)}</TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">{moyennes.margePercent}%</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Statistics Sidebar - 1/3 width */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="space-y-6"
          >
            {/* Contrats réalisés */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-500/20">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  Contrats Réalisés
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-green-500/10">
                    <p className="text-sm text-muted-foreground">Nombre</p>
                    <p className="text-2xl font-bold text-green-600">{metrics?.total_contracts || 0}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-green-500/10">
                    <p className="text-sm text-muted-foreground">Marge</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(Number(realizedStats?.total_margin || 0))}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-green-200/50">
                    <span className="text-sm font-medium">Montant CA</span>
                    <span className="font-bold text-green-700">{formatCurrency(Number(realizedStats?.total_revenue || 0))}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-medium">Achats</span>
                    <span className="font-bold text-green-700">{formatCurrency(Number(realizedStats?.total_purchases || 0))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contrats en attente */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-3">
                  <div className="p-2 rounded-full bg-orange-500/20">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  En Attente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-orange-500/10">
                    <p className="text-sm text-muted-foreground">Nombre</p>
                    <p className="text-2xl font-bold text-orange-600">{metrics?.pending_offers || 0}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-orange-500/10">
                    <p className="text-sm text-muted-foreground">Potentiel</p>
                    <p className="text-xl font-bold text-orange-600">{formatCurrency(Number(pendingStats?.total_margin || 0))}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-orange-200/50">
                    <span className="text-sm font-medium">Montant potentiel</span>
                    <span className="font-bold text-orange-700">{formatCurrency(Number(pendingStats?.total_revenue || 0))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contrats refusés */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/10 dark:to-pink-900/10 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-3">
                  <div className="p-2 rounded-full bg-red-500/20">
                    <Target className="w-5 h-5 text-red-600" />
                  </div>
                  Refusés/Sans Suite
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-red-500/10">
                    <p className="text-sm text-muted-foreground">Nombre</p>
                    <p className="text-2xl font-bold text-red-600">{refusedStats?.count || 0}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-red-500/10">
                    <p className="text-sm text-muted-foreground">Perdu</p>
                    <p className="text-xl font-bold text-red-600">{formatCurrency(Number(refusedStats?.total_margin || 0))}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-red-200/50">
                    <span className="text-sm font-medium">Montant perdu</span>
                    <span className="font-bold text-red-700">{formatCurrency(Number(refusedStats?.total_revenue || 0))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions rapides */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/5 to-accent/5 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold">Actions Rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-start h-12 border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-all duration-300"
                  onClick={() => navigate('/itakecare/admin/clients')}
                >
                  <UserPlus className="w-5 h-5 mr-3" />
                  Nouveau Client
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-start h-12 border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-all duration-300"
                  onClick={() => navigate('/itakecare/admin/offers')}
                >
                  <PlusCircle className="w-5 h-5 mr-3" />
                  Créer une Offre
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-start h-12 border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-all duration-300"
                  onClick={() => navigate('/itakecare/admin/contracts')}
                >
                  <Eye className="w-5 h-5 mr-3" />
                  Voir les Contrats
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-start h-12 border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-all duration-300"
                  onClick={() => navigate('/itakecare/admin/reports')}
                >
                  <BarChart3 className="w-5 h-5 mr-3" />
                  Rapports Détaillés
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDashboard;