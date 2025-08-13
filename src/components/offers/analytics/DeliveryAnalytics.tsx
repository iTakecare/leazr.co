import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { TrendingUp, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DeliveryMetrics {
  totalDeliveries: number;
  onTimeDeliveries: number;
  delayedDeliveries: number;
  averageDeliveryTime: number;
  topRegions: Array<{ region: string; count: number; percentage: number }>;
  monthlyTrends: Array<{ month: string; deliveries: number; onTime: number; delayed: number }>;
  deliveryTypes: Array<{ type: string; count: number; percentage: number }>;
  costAnalysis: { totalLogisticsCost: number; costPerDelivery: number; regionCosts: any[] };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const typeLabels = {
  'main_client': 'Client principal',
  'collaborator': 'Collaborateur',
  'predefined_site': 'Site prédéfini',
  'specific_address': 'Adresse spécifique'
};

const DeliveryAnalytics: React.FC = () => {
  const [metrics, setMetrics] = useState<DeliveryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6months');
  const [selectedRegion, setSelectedRegion] = useState('all');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Simuler des données d'analyse avancées
      // Dans un vrai projet, ces données viendraient de requêtes Supabase complexes
      const { data: equipmentData, error } = await supabase
        .from('offer_equipment')
        .select(`
          id,
          delivery_type,
          delivery_city,
          created_at,
          offer:offers!offer_equipment_offer_id_fkey(
            client_name:clients(name)
          )
        `)
        .not('delivery_type', 'is', null);

      if (error) {
        console.error('Erreur lors du chargement des analytics:', error);
        return;
      }

      // Générer des métriques simulées mais réalistes
      const totalDeliveries = equipmentData?.length || 0;
      const onTimeDeliveries = Math.floor(totalDeliveries * 0.85); // 85% à temps
      const delayedDeliveries = totalDeliveries - onTimeDeliveries;

      // Analyser les types de livraison
      const deliveryTypesCounts = {};
      equipmentData?.forEach(item => {
        const type = item.delivery_type || 'main_client';
        deliveryTypesCounts[type] = (deliveryTypesCounts[type] || 0) + 1;
      });

      const deliveryTypes = Object.entries(deliveryTypesCounts).map(([type, count]) => ({
        type: typeLabels[type] || type,
        count: count as number,
        percentage: Math.round((count as number / totalDeliveries) * 100)
      }));

      // Analyser les régions
      const regionCounts = {};
      equipmentData?.forEach(item => {
        const region = item.delivery_city || 'Non spécifiée';
        regionCounts[region] = (regionCounts[region] || 0) + 1;
      });

      const topRegions = Object.entries(regionCounts)
        .map(([region, count]) => ({
          region,
          count: count as number,
          percentage: Math.round((count as number / totalDeliveries) * 100)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Générer des données de tendance mensuelle
      const monthlyTrends = Array.from({ length: 6 }, (_, i) => {
        const date = subMonths(new Date(), 5 - i);
        const deliveries = Math.floor(Math.random() * 50) + 20;
        const onTime = Math.floor(deliveries * 0.85);
        return {
          month: format(date, 'MMM yyyy', { locale: fr }),
          deliveries,
          onTime,
          delayed: deliveries - onTime
        };
      });

      const mockMetrics: DeliveryMetrics = {
        totalDeliveries,
        onTimeDeliveries,
        delayedDeliveries,
        averageDeliveryTime: 3.2, // jours
        topRegions,
        monthlyTrends,
        deliveryTypes,
        costAnalysis: {
          totalLogisticsCost: totalDeliveries * 45, // 45€ par livraison en moyenne
          costPerDelivery: 45,
          regionCosts: topRegions.map(region => ({
            ...region,
            avgCost: Math.floor(Math.random() * 30) + 30 // 30-60€
          }))
        }
      };

      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Erreur lors du chargement des analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, selectedRegion]);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-32 bg-muted/50" />
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Aucune donnée disponible</p>
        </CardContent>
      </Card>
    );
  }

  const deliverySuccessRate = metrics.totalDeliveries > 0 
    ? Math.round((metrics.onTimeDeliveries / metrics.totalDeliveries) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics de livraison</h1>
          <p className="text-muted-foreground">Insights sur les performances logistiques</p>
        </div>
        
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">1 mois</SelectItem>
              <SelectItem value="3months">3 mois</SelectItem>
              <SelectItem value="6months">6 mois</SelectItem>
              <SelectItem value="1year">1 an</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total livraisons</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.totalDeliveries}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Taux de réussite</p>
                <p className="text-2xl font-bold text-green-600">{deliverySuccessRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Délai moyen</p>
                <p className="text-2xl font-bold text-yellow-600">{metrics.averageDeliveryTime}j</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Coût moyen</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.costAnalysis.costPerDelivery}€</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendances mensuelles */}
        <Card>
          <CardHeader>
            <CardTitle>Tendances mensuelles</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="deliveries" stroke="#8884d8" name="Total" />
                <Line type="monotone" dataKey="onTime" stroke="#82ca9d" name="À temps" />
                <Line type="monotone" dataKey="delayed" stroke="#ffc658" name="Retardées" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Répartition par type */}
        <Card>
          <CardHeader>
            <CardTitle>Types de livraison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={metrics.deliveryTypes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, percentage }) => `${type} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {metrics.deliveryTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top régions */}
      <Card>
        <CardHeader>
          <CardTitle>Top régions de livraison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.topRegions}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="region" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Analyse des coûts */}
      <Card>
        <CardHeader>
          <CardTitle>Analyse des coûts logistiques</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Coût total</p>
              <p className="text-2xl font-bold text-primary">
                {metrics.costAnalysis.totalLogisticsCost.toLocaleString()}€
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Coût par livraison</p>
              <p className="text-2xl font-bold text-primary">
                {metrics.costAnalysis.costPerDelivery}€
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Économies potentielles</p>
              <p className="text-2xl font-bold text-green-600">
                {Math.floor(metrics.costAnalysis.totalLogisticsCost * 0.15).toLocaleString()}€
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Coûts par région</h4>
            {metrics.costAnalysis.regionCosts.slice(0, 5).map((region, index) => (
              <div key={index} className="flex justify-between items-center p-2 border rounded">
                <span className="font-medium">{region.region}</span>
                <div className="text-right">
                  <Badge variant="secondary" className="mr-2">
                    {region.count} livraisons
                  </Badge>
                  <span className="font-medium">{region.avgCost}€/livraison</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryAnalytics;