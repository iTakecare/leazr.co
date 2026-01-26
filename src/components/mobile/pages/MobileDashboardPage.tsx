import React, { useState } from "react";
import { BarChart3, Users, TrendingUp, FileText, DollarSign, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import MobileLayout from "../MobileLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import CompanyDashboard from "@/components/dashboard/CompanyDashboard";
import CommercialDashboard from "@/components/dashboard/CommercialDashboard";

// Simple KPI card for mobile
interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

const MobileKPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-4"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        {trend && trendValue && (
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            trend === 'up' && "bg-primary/10 text-primary",
            trend === 'down' && "bg-destructive/10 text-destructive",
            trend === 'neutral' && "bg-muted text-muted-foreground"
          )}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{title}</p>
      {subtitle && (
        <p className="text-xs text-primary mt-1">{subtitle}</p>
      )}
    </motion.div>
  );
};

const MobileDashboardPage: React.FC = () => {
  const { preferences, isLoading } = useUserPreferences();
  const [activeTab, setActiveTab] = useState<string>(
    preferences?.default_dashboard || 'financial'
  );

  React.useEffect(() => {
    if (!isLoading && preferences?.default_dashboard) {
      setActiveTab(preferences.default_dashboard);
    }
  }, [preferences, isLoading]);

  return (
    <MobileLayout
      title="Tableau de bord"
      showSearch={false}
    >
      <div className="space-y-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Tableau de bord</h1>
            <p className="text-sm text-muted-foreground">
              Vue d'ensemble de votre activité
            </p>
          </div>
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
          
          <TabsContent value="financial" className="mt-4">
            {/* Wrap CompanyDashboard in a mobile-friendly container */}
            <div className="space-y-4">
              <CompanyDashboard />
            </div>
          </TabsContent>
          
          <TabsContent value="commercial" className="mt-4">
            {/* Wrap CommercialDashboard in a mobile-friendly container */}
            <div className="space-y-4">
              <CommercialDashboard />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
};

export default MobileDashboardPage;
