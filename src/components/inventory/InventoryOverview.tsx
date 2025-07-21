import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Users, Wrench, MapPin, AlertTriangle, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getInventoryStats, getInventoryProducts, getEquipmentAlerts } from "@/services/inventoryService";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const InventoryOverview: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["inventory-stats"],
    queryFn: getInventoryStats,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["inventory-products"],
    queryFn: getInventoryProducts,
  });

  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ["equipment-alerts"],
    queryFn: () => getEquipmentAlerts(),
  });

  const statusColors = {
    available: "#22c55e",
    assigned: "#3b82f6", 
    maintenance: "#f59e0b",
    retired: "#6b7280",
    missing: "#ef4444",
  };

  const statusData = stats ? [
    { name: "Disponible", value: stats.available, color: statusColors.available },
    { name: "Assigné", value: stats.assigned, color: statusColors.assigned },
    { name: "Maintenance", value: stats.maintenance, color: statusColors.maintenance },
    { name: "Retiré", value: stats.retired, color: statusColors.retired },
    { name: "Manquant", value: stats.missing, color: statusColors.missing },
  ] : [];

  const unreadAlerts = alerts.filter(alert => !alert.is_read && !alert.is_dismissed);
  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical' && !alert.is_dismissed);

  if (statsLoading || productsLoading || alertsLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Métriques principales */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Équipements</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              Dans l'inventaire
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disponibles</CardTitle>
            <Package className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats?.available || 0}</div>
            <p className="text-xs text-muted-foreground">
              Prêts à être assignés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Maintenance</CardTitle>
            <Wrench className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats?.maintenance || 0}</div>
            <p className="text-xs text-muted-foreground">
              Nécessitent attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{unreadAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Non lues
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertes critiques */}
      {criticalAlerts.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alertes Critiques
            </CardTitle>
            <CardDescription>
              {criticalAlerts.length} alerte(s) nécessitent une attention immédiate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalAlerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                  <div>
                    <p className="font-medium text-destructive">{alert.title}</p>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                  </div>
                  <Badge variant="destructive">Critique</Badge>
                </div>
              ))}
              {criticalAlerts.length > 3 && (
                <Button variant="outline" size="sm" className="w-full">
                  Voir toutes les alertes ({criticalAlerts.length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Graphiques */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Répartition par Statut</CardTitle>
            <CardDescription>
              Distribution des équipements selon leur statut
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
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

        <Card>
          <CardHeader>
            <CardTitle>Équipements Récents</CardTitle>
            <CardDescription>
              Derniers équipements ajoutés à l'inventaire
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {products.slice(0, 5).map((product: any) => (
                <div key={product.id} className="flex items-center space-x-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {product.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {product.location || 'Emplacement non défini'} • 
                      <Badge 
                        variant={product.status === 'available' ? 'default' : 'secondary'} 
                        className="ml-2"
                      >
                        {product.status || 'available'}
                      </Badge>
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {product.serial_number || 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InventoryOverview;