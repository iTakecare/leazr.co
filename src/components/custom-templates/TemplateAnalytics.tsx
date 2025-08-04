import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Activity, Eye, Edit, Share, Download, Clock, TrendingUp } from 'lucide-react';
import { templateAnalyticsService } from '@/services/templateAnalyticsService';
import { toast } from 'sonner';

interface TemplateAnalyticsProps {
  templateId: string;
}

export function TemplateAnalytics({ templateId }: TemplateAnalyticsProps) {
  const [usageStats, setUsageStats] = useState<any>(null);
  const [performanceScore, setPerformanceScore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    loadAnalytics();
  }, [templateId, timeRange]);

  const loadAnalytics = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      const [stats, score] = await Promise.all([
        templateAnalyticsService.getUsageStats(templateId, startDate, endDate),
        templateAnalyticsService.getTemplatePerformanceScore(templateId)
      ]);

      setUsageStats(stats);
      setPerformanceScore(score);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Erreur lors du chargement des analytics');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

  if (loading) {
    return <div className="flex items-center justify-center p-8">Chargement des analytics...</div>;
  }

  if (!usageStats) {
    return <div className="text-center p-8">Aucune donnée disponible</div>;
  }

  const usageData = [
    { name: 'Vues', value: usageStats.totalViews, icon: Eye, color: '#3b82f6' },
    { name: 'Éditions', value: usageStats.totalEdits, icon: Edit, color: '#ef4444' },
    { name: 'Générations', value: usageStats.totalGenerations, icon: Download, color: '#10b981' },
    { name: 'Partages', value: usageStats.totalShares, icon: Share, color: '#f59e0b' },
  ];

  const dailyUsageData = usageStats.usageByDay.reduce((acc: any[], curr: any) => {
    const existingDay = acc.find(item => item.date === curr.date);
    if (existingDay) {
      existingDay[curr.action_type] = curr.count;
    } else {
      acc.push({
        date: curr.date,
        [curr.action_type]: curr.count,
        view: 0,
        edit: 0,
        generate: 0,
        share: 0
      });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header avec sélecteur de période */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6" />
          Analytics du Template
        </h2>
        
        <Select value={timeRange} onValueChange={(value) => setTimeRange(value as 'week' | 'month' | 'year')}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">7 derniers jours</SelectItem>
            <SelectItem value="month">30 derniers jours</SelectItem>
            <SelectItem value="year">12 derniers mois</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Score de performance global */}
      {performanceScore && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Score de Performance Global
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="text-4xl font-bold text-primary">
                {performanceScore.score}/100
              </div>
              <Badge variant={performanceScore.score >= 75 ? "default" : performanceScore.score >= 50 ? "secondary" : "destructive"}>
                {performanceScore.score >= 75 ? "Excellent" : performanceScore.score >= 50 ? "Bon" : "À améliorer"}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-semibold">{performanceScore.breakdown.usage}</div>
                <div className="text-sm text-muted-foreground">Usage</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold">{performanceScore.breakdown.performance}</div>
                <div className="text-sm text-muted-foreground">Performance</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold">{performanceScore.breakdown.reliability}</div>
                <div className="text-sm text-muted-foreground">Fiabilité</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold">{performanceScore.breakdown.userSatisfaction}</div>
                <div className="text-sm text-muted-foreground">Satisfaction</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métriques principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {usageData.map((metric) => (
          <Card key={metric.name}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{metric.name}</p>
                  <p className="text-2xl font-bold">{metric.value}</p>
                </div>
                <metric.icon className="h-8 w-8" style={{ color: metric.color }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Statistiques additionnelles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold">{usageStats.uniqueUsers}</div>
            <p className="text-sm text-muted-foreground">Utilisateurs uniques</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold flex items-center justify-center gap-1">
              <Clock className="h-5 w-5" />
              {Math.round(usageStats.averageEditDuration / 60)}m
            </div>
            <p className="text-sm text-muted-foreground">Durée moyenne d'édition</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold">
              {usageStats.totalViews + usageStats.totalEdits + usageStats.totalGenerations + usageStats.totalShares}
            </div>
            <p className="text-sm text-muted-foreground">Total interactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique en barres - Usage par type */}
        <Card>
          <CardHeader>
            <CardTitle>Usage par type d'action</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={usageData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {usageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Graphique linéaire - Évolution dans le temps */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution de l'usage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyUsageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Legend />
                <Line type="monotone" dataKey="view" stroke="#3b82f6" name="Vues" />
                <Line type="monotone" dataKey="edit" stroke="#ef4444" name="Éditions" />
                <Line type="monotone" dataKey="generate" stroke="#10b981" name="Générations" />
                <Line type="monotone" dataKey="share" stroke="#f59e0b" name="Partages" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}