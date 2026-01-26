import React, { useState } from "react";
import { 
  BarChart3, 
  DollarSign, 
  Users, 
  ShoppingCart, 
  TrendingUp, 
  Target, 
  FileCheck, 
  Clock, 
  XCircle, 
  Sparkles,
  RefreshCw,
  ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";
import MobileLayout from "../MobileLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useCompanyDashboard } from "@/hooks/useCompanyDashboard";
import { formatCurrency } from "@/utils/formatters";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";

// KPI Card for mobile
interface MobileKPICardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'info';
}

const MobileKPICard: React.FC<MobileKPICardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  variant = 'default',
}) => {
  const variantStyles = {
    default: "bg-card border-border",
    success: "bg-primary/5 border-primary/20",
    warning: "bg-orange-500/5 border-orange-500/20",
    info: "bg-blue-500/5 border-blue-500/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "border rounded-xl p-4",
        variantStyles[variant]
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {trend && trendValue && (
            <span className={cn(
              "text-xs font-medium",
              trend === 'up' && "text-primary",
              trend === 'down' && "text-destructive",
              trend === 'neutral' && "text-muted-foreground"
            )}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
            </span>
          )}
        </div>
        <div className={cn(
          "h-12 w-12 rounded-xl flex items-center justify-center",
          variant === 'success' && "bg-primary/10",
          variant === 'warning' && "bg-orange-500/10",
          variant === 'info' && "bg-blue-500/10",
          variant === 'default' && "bg-muted"
        )}>
          <Icon className={cn(
            "h-6 w-6",
            variant === 'success' && "text-primary",
            variant === 'warning' && "text-orange-500",
            variant === 'info' && "text-blue-500",
            variant === 'default' && "text-muted-foreground"
          )} />
        </div>
      </div>
    </motion.div>
  );
};

// Statistics Card for mobile
interface MobileStatCardProps {
  title: string;
  count: number;
  margin: number;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  onClick?: () => void;
}

const MobileStatCard: React.FC<MobileStatCardProps> = ({
  title,
  count,
  margin,
  icon: Icon,
  iconColor,
  bgColor,
  onClick,
}) => {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg cursor-pointer"
    >
      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", bgColor)}>
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{count} dossier{count > 1 ? 's' : ''}</span>
          <span>•</span>
          <span className="text-primary font-medium">{formatCurrency(margin)}</span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </motion.div>
  );
};

const MobileDashboardPage: React.FC = () => {
  const { preferences, isLoading: prefsLoading } = useUserPreferences();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [activeTab, setActiveTab] = useState<string>(
    preferences?.default_dashboard || 'financial'
  );
  
  const { 
    metrics, 
    isLoading, 
    refetch 
  } = useCompanyDashboard(selectedYear);
  
  const { navigateToAdmin } = useRoleNavigation();

  // Extract data from metrics
  const monthlyData = metrics?.monthly_data || [];
  const contractStats = metrics?.contract_stats || [];

  React.useEffect(() => {
    if (!prefsLoading && preferences?.default_dashboard) {
      setActiveTab(preferences.default_dashboard);
    }
  }, [preferences, prefsLoading]);

  // Calculate totals from monthly data
  const yearTotals = React.useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) {
      return {
        totalRevenue: 0,
        totalPurchases: 0,
        totalMargin: 0,
        marginRate: 0,
      };
    }

    const totalRevenue = monthlyData.reduce((sum: number, m: any) => sum + (m.revenue || 0), 0);
    const totalPurchases = monthlyData.reduce((sum: number, m: any) => sum + (m.purchases || 0), 0);
    const totalMargin = monthlyData.reduce((sum: number, m: any) => sum + (m.margin || 0), 0);
    const marginRate = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalPurchases,
      totalMargin,
      marginRate,
    };
  }, [monthlyData]);

  // Get statistics by status
  const getStatByStatus = (status: string) => {
    return contractStats?.find(s => s.status === status) || {
      count: 0,
      total_revenue: 0,
      total_purchases: 0,
      total_margin: 0,
    };
  };

  const realizedStats = getStatByStatus('realized');
  const pendingStats = getStatByStatus('pending');
  const directSalesStats = getStatByStatus('direct_sales');
  const refusedStats = getStatByStatus('refused');
  const forecastStats = getStatByStatus('forecast');

  // Generate year options
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <MobileLayout title="Tableau de bord" showSearch={false}>
        <div className="space-y-4 pb-8">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Tableau de bord</h1>
              <p className="text-sm text-muted-foreground">Chargement...</p>
            </div>
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Tableau de bord" showSearch={false}>
      <div className="space-y-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Tableau de bord</h1>
              <p className="text-sm text-muted-foreground">
                Vue d'ensemble {selectedYear}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            className="h-10 w-10"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Select
            value={selectedYear.toString()}
            onValueChange={(val) => setSelectedYear(parseInt(val))}
          >
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder="Année" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs for Financial/Commercial */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="financial" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Financier
            </TabsTrigger>
            <TabsTrigger value="commercial" className="gap-2">
              <Users className="h-4 w-4" />
              Commercial
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="financial" className="mt-4 space-y-4">
            {/* Main KPIs */}
            <div className="space-y-3">
              <MobileKPICard
                title="Chiffre d'affaires"
                value={formatCurrency(yearTotals.totalRevenue)}
                icon={DollarSign}
                variant="success"
              />
              <MobileKPICard
                title="Achats totaux"
                value={formatCurrency(yearTotals.totalPurchases)}
                icon={ShoppingCart}
                variant="info"
              />
              <MobileKPICard
                title="Marge brute"
                value={formatCurrency(yearTotals.totalMargin)}
                icon={TrendingUp}
                variant="success"
              />
              <MobileKPICard
                title="Taux de marge"
                value={`${yearTotals.marginRate.toFixed(2)}%`}
                icon={Target}
                variant="default"
              />
            </div>

            {/* Statistics Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Statistiques par statut
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <MobileStatCard
                  title="Contrats réalisés"
                  count={realizedStats.count}
                  margin={realizedStats.total_margin}
                  icon={FileCheck}
                  iconColor="text-primary"
                  bgColor="bg-primary/10"
                  onClick={() => navigateToAdmin('contracts')}
                />
                <MobileStatCard
                  title="En attente"
                  count={pendingStats.count}
                  margin={pendingStats.total_margin}
                  icon={Clock}
                  iconColor="text-orange-500"
                  bgColor="bg-orange-500/10"
                  onClick={() => navigateToAdmin('offers')}
                />
                <MobileStatCard
                  title="Ventes directes"
                  count={directSalesStats.count}
                  margin={directSalesStats.total_margin}
                  icon={ShoppingCart}
                  iconColor="text-blue-500"
                  bgColor="bg-blue-500/10"
                />
                <MobileStatCard
                  title="Refusés"
                  count={refusedStats.count}
                  margin={refusedStats.total_margin}
                  icon={XCircle}
                  iconColor="text-destructive"
                  bgColor="bg-destructive/10"
                />
              </CardContent>
            </Card>

            {/* Forecast Card */}
            <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-500" />
                  Prévisionnel total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Nombre total</p>
                    <p className="text-lg font-bold">{forecastStats.count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Marge prévue</p>
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(forecastStats.total_margin)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">CA prévisionnel</p>
                    <p className="text-lg font-bold">
                      {formatCurrency(forecastStats.total_revenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Achats prévus</p>
                    <p className="text-lg font-bold">
                      {formatCurrency(forecastStats.total_purchases)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="commercial" className="mt-4 space-y-4">
            {/* Commercial KPIs */}
            <div className="space-y-3">
              <MobileKPICard
                title="Contrats réalisés"
                value={realizedStats.count.toString()}
                icon={FileCheck}
                variant="success"
              />
              <MobileKPICard
                title="Dossiers en attente"
                value={pendingStats.count.toString()}
                icon={Clock}
                variant="warning"
              />
              <MobileKPICard
                title="Ventes directes"
                value={directSalesStats.count.toString()}
                icon={ShoppingCart}
                variant="info"
              />
              <MobileKPICard
                title="Taux de conversion"
                value={`${(realizedStats.count + pendingStats.count) > 0 
                  ? ((realizedStats.count / (realizedStats.count + pendingStats.count)) * 100).toFixed(1) 
                  : 0}%`}
                icon={Target}
                variant="default"
              />
            </div>

            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Résumé commercial</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Total dossiers</span>
                  <Badge variant="secondary">
                    {realizedStats.count + pendingStats.count + directSalesStats.count + refusedStats.count}
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">CA total réalisé</span>
                  <span className="font-semibold">{formatCurrency(realizedStats.total_revenue)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">CA en attente</span>
                  <span className="font-semibold text-orange-500">{formatCurrency(pendingStats.total_revenue)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Marge totale</span>
                  <span className="font-bold text-primary">{formatCurrency(realizedStats.total_margin + directSalesStats.total_margin)}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
};

export default MobileDashboardPage;
