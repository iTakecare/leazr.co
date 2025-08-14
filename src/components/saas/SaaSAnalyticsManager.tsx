import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart3, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Download,
  Eye,
  Target,
  Activity
} from "lucide-react";
import { useSaaSAnalytics } from "@/hooks/useSaaSData";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const SaaSAnalyticsManager = () => {
  const [period, setPeriod] = useState("30");
  const { analytics, loading } = useSaaSAnalytics(period);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Chargement des analytics...</span>
      </div>
    );
  }

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Analytics SaaS</h2>
          <p className="text-muted-foreground">Visualisez les performances et métriques de votre plateforme</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 derniers jours</SelectItem>
              <SelectItem value="30">30 derniers jours</SelectItem>
              <SelectItem value="90">3 derniers mois</SelectItem>
              <SelectItem value="365">12 derniers mois</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenus Mensuels (MRR)</p>
                <p className="text-2xl font-bold">€{analytics?.mrr?.toLocaleString() || '0'}</p>
                <div className="flex items-center text-sm mt-1">
                  {analytics?.mrr_growth >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                  )}
                  <span className={analytics?.mrr_growth >= 0 ? "text-green-600" : "text-red-600"}>
                    {Math.abs(analytics?.mrr_growth || 0)}%
                  </span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Clients Actifs</p>
                <p className="text-2xl font-bold">{analytics?.active_customers || 0}</p>
                <div className="flex items-center text-sm mt-1">
                  <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-green-600">{analytics?.customer_growth || 0}%</span>
                </div>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taux de Churn</p>
                <p className="text-2xl font-bold">{analytics?.churn_rate || 0}%</p>
                <div className="flex items-center text-sm mt-1">
                  <TrendingDown className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-green-600">-0.5%</span>
                </div>
              </div>
              <Activity className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taux de Conversion</p>
                <p className="text-2xl font-bold">{analytics?.conversion_rate || 0}%</p>
                <div className="flex items-center text-sm mt-1">
                  <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-green-600">+2.1%</span>
                </div>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution du chiffre d'affaires */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution du Chiffre d'Affaires</CardTitle>
            <CardDescription>Revenus mensuels récurrents sur la période sélectionnée</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics?.revenue_chart || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`€${value}`, 'Revenus']} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--chart-1))" 
                  fill="hsl(var(--chart-1))" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Acquisition de clients */}
        <Card>
          <CardHeader>
            <CardTitle>Acquisition de Clients</CardTitle>
            <CardDescription>Nouveaux clients acquis par mois</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics?.customers_chart || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="new_customers" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Répartition et détails */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Répartition par plan */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition par Plan</CardTitle>
            <CardDescription>Distribution des clients par type d'abonnement</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={analytics?.plans_distribution || []}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {(analytics?.plans_distribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Métriques de performance */}
        <Card>
          <CardHeader>
            <CardTitle>Métriques Clés</CardTitle>
            <CardDescription>Indicateurs de performance importants</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">LTV (Valeur Vie Client)</span>
              <span className="text-lg font-bold">€{analytics?.ltv || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">CAC (Coût d'Acquisition)</span>
              <span className="text-lg font-bold">€{analytics?.cac || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Ratio LTV/CAC</span>
              <Badge variant={analytics?.ltv_cac_ratio > 3 ? "default" : "destructive"}>
                {analytics?.ltv_cac_ratio || 0}x
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">ARR (Revenus Annuels)</span>
              <span className="text-lg font-bold">€{((analytics?.mrr || 0) * 12).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Activité récente */}
        <Card>
          <CardHeader>
            <CardTitle>Activité Récente</CardTitle>
            <CardDescription>Derniers événements importants</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics?.recent_activity?.map((activity, index) => (
              <div key={index} className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="font-medium">{activity.title}</p>
                  <p className="text-muted-foreground text-xs">{activity.time}</p>
                </div>
              </div>
            )) || (
              <p className="text-muted-foreground text-center py-4">Aucune activité récente</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SaaSAnalyticsManager;