import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  FileText, 
  HandHeart,
  Euro,
  Calendar,
  Activity,
  Filter,
  Download
} from "lucide-react";
import { useCompanyDashboard } from "@/hooks/useCompanyDashboard";
import { useCompanyBranding } from "@/context/CompanyBrandingContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CompanyDashboard = () => {
  const [timeFilter, setTimeFilter] = useState('month');
  const { metrics, recentActivity, isLoading } = useCompanyDashboard();
  const { branding } = useCompanyBranding();

  // Couleurs pour les graphiques (utilise le branding de l'entreprise)
  const chartColors = {
    primary: branding?.primary_color || '#3b82f6',
    secondary: branding?.secondary_color || '#64748b',
    accent: branding?.accent_color || '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444'
  };

  // Données pour les graphiques
  const kpiData = [
    {
      title: "Chiffre d'affaires",
      value: metrics?.total_revenue || 0,
      growth: metrics?.monthly_growth_revenue || 0,
      icon: Euro,
      format: "currency"
    },
    {
      title: "Clients",
      value: metrics?.total_clients || 0,
      growth: metrics?.monthly_growth_clients || 0,
      icon: Users,
      format: "number"
    },
    {
      title: "Offres",
      value: metrics?.total_offers || 0,
      growth: 0,
      icon: FileText,
      format: "number"
    },
    {
      title: "Contrats",
      value: metrics?.total_contracts || 0,
      growth: 0,
      icon: HandHeart,
      format: "number"
    }
  ];

  const statusData = [
    { name: 'Offres en attente', value: metrics?.pending_offers || 0, color: chartColors.warning },
    { name: 'Contrats actifs', value: metrics?.active_contracts || 0, color: chartColors.success },
    { name: 'Clients total', value: metrics?.total_clients || 0, color: chartColors.primary }
  ];

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('fr-FR', { 
          style: 'currency', 
          currency: 'EUR' 
        }).format(value);
      case 'number':
        return new Intl.NumberFormat('fr-FR').format(value);
      default:
        return value.toString();
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'client_created': return Users;
      case 'offer_created': return FileText;
      case 'contract_created': return HandHeart;
      default: return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'client_created': return 'bg-blue-100 text-blue-600';
      case 'offer_created': return 'bg-yellow-100 text-yellow-600';
      case 'contract_created': return 'bg-green-100 text-green-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Vue d'ensemble de votre activité</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-8 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Vue d'ensemble de votre activité</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Semaine</SelectItem>
              <SelectItem value="month">Mois</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Année</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Exporter
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => {
          const IconComponent = kpi.icon;
          const isPositive = kpi.growth >= 0;
          
          return (
            <Card key={index} className="relative overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                    <p className="text-2xl font-bold">{formatValue(kpi.value, kpi.format)}</p>
                    {kpi.growth !== 0 && (
                      <div className={`flex items-center text-sm ${
                        isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isPositive ? (
                          <TrendingUp className="h-4 w-4 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 mr-1" />
                        )}
                        {Math.abs(kpi.growth).toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <div 
                    className="p-3 rounded-full"
                    style={{ backgroundColor: chartColors.primary + '20' }}
                  >
                    <IconComponent 
                      className="h-6 w-6" 
                      style={{ color: chartColors.primary }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Graphiques et tableau de bord */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Statut des affaires */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition des affaires</CardTitle>
            <CardDescription>
              Statut actuel de vos offres et contrats
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Activité récente */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activité récente
            </CardTitle>
            <CardDescription>
              Dernières actions dans votre système
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {recentActivity.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Aucune activité récente
                </p>
              ) : (
                recentActivity.map((activity, index) => {
                  const IconComponent = getActivityIcon(activity.activity_type);
                  const colorClass = getActivityColor(activity.activity_type);
                  
                  return (
                    <div key={index} className="flex items-center gap-4 p-3 rounded-lg border">
                      <div className={`p-2 rounded-full ${colorClass}`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {activity.activity_description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.entity_name} • {activity.user_name}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>
            Accédez rapidement aux fonctionnalités principales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Users className="h-6 w-6" />
              <span className="text-sm">Nouveau client</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <FileText className="h-6 w-6" />
              <span className="text-sm">Créer offre</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <HandHeart className="h-6 w-6" />
              <span className="text-sm">Voir contrats</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Filter className="h-6 w-6" />
              <span className="text-sm">Rapports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyDashboard;