import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Bell, CheckCircle, Eye, EyeOff, X, Search, Filter, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getEquipmentAlerts, markAlertAsRead, dismissAlert, createMaintenanceAlerts } from "@/services/inventoryService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

const AlertsPanel: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showDismissed, setShowDismissed] = useState(false);
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading, refetch } = useQuery({
    queryKey: ["equipment-alerts"],
    queryFn: () => getEquipmentAlerts(),
  });

  const markAsReadMutation = useMutation({
    mutationFn: markAlertAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-alerts"] });
      toast.success("Alerte marquée comme lue");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const dismissMutation = useMutation({
    mutationFn: dismissAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-alerts"] });
      toast.success("Alerte ignorée");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  const createAlertsMutation = useMutation({
    mutationFn: createMaintenanceAlerts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-alerts"] });
      toast.success("Alertes de maintenance créées");
    },
    onError: () => {
      toast.error("Erreur lors de la création des alertes");
    },
  });

  const filteredAlerts = alerts.filter((alert: any) => {
    const matchesSearch = 
      alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.equipment?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = filterSeverity === "all" || alert.severity === filterSeverity;
    const matchesType = filterType === "all" || alert.alert_type === filterType;
    const matchesDismissed = showDismissed || !alert.is_dismissed;
    
    return matchesSearch && matchesSeverity && matchesType && matchesDismissed;
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'info':
      default:
        return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      critical: 'destructive',
      error: 'destructive',
      warning: 'secondary',
      info: 'outline',
    };
    return variants[severity as keyof typeof variants] || 'outline';
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      maintenance_due: 'Maintenance due',
      warranty_expiring: 'Garantie expirante',
      overdue_return: 'Retour en retard',
      location_change: 'Changement lieu',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const unreadCount = alerts.filter((a: any) => !a.is_read && !a.is_dismissed).length;
  const criticalCount = alerts.filter((a: any) => a.severity === 'critical' && !a.is_dismissed).length;
  const dismissedCount = alerts.filter((a: any) => a.is_dismissed).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Centre d'Alertes</h3>
          <p className="text-sm text-muted-foreground">
            Gérez les notifications et alertes système
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => createAlertsMutation.mutate()}
            disabled={createAlertsMutation.isPending}
          >
            {createAlertsMutation.isPending ? "Création..." : "Générer Alertes"}
          </Button>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Statistiques des alertes */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Non Lues</CardTitle>
            <Bell className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{unreadCount}</div>
            <p className="text-xs text-muted-foreground">
              Nécessitent attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critiques</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalCount}</div>
            <p className="text-xs text-muted-foreground">
              Action immédiate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ignorées</CardTitle>
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{dismissedCount}</div>
            <p className="text-xs text-muted-foreground">
              Masquées
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Toutes alertes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher dans les alertes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-[150px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toute sévérité</SelectItem>
                <SelectItem value="critical">Critique</SelectItem>
                <SelectItem value="error">Erreur</SelectItem>
                <SelectItem value="warning">Avertissement</SelectItem>
                <SelectItem value="info">Information</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="maintenance_due">Maintenance due</SelectItem>
                <SelectItem value="warranty_expiring">Garantie expirante</SelectItem>
                <SelectItem value="overdue_return">Retour en retard</SelectItem>
                <SelectItem value="location_change">Changement lieu</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={showDismissed ? "default" : "outline"}
              onClick={() => setShowDismissed(!showDismissed)}
              className="whitespace-nowrap"
            >
              {showDismissed ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
              Ignorées
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des alertes */}
      <Card>
        <CardHeader>
          <CardTitle>Alertes Actives</CardTitle>
          <CardDescription>
            {filteredAlerts.length} alerte(s) trouvée(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Chargement des alertes...</p>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Aucune alerte trouvée</p>
              {!showDismissed && (
                <Button 
                  className="mt-4" 
                  variant="outline"
                  onClick={() => setShowDismissed(true)}
                >
                  Afficher les alertes ignorées
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map((alert: any) => (
                <div 
                  key={alert.id} 
                  className={`flex items-start justify-between p-4 border rounded-lg transition-opacity ${
                    alert.is_dismissed ? 'opacity-50' : ''
                  } ${
                    !alert.is_read && !alert.is_dismissed ? 'bg-accent/50' : ''
                  }`}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(alert.severity)}
                      <p className={`font-medium ${!alert.is_read ? 'font-bold' : ''}`}>
                        {alert.title}
                      </p>
                      <Badge variant={getSeverityBadge(alert.severity) as any}>
                        {alert.severity}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {getTypeLabel(alert.alert_type)}
                      </Badge>
                      {!alert.is_read && !alert.is_dismissed && (
                        <Badge variant="default" className="text-xs">
                          Nouveau
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {alert.equipment && (
                        <span>Équipement: {alert.equipment.name}</span>
                      )}
                      <span>{format(new Date(alert.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {!alert.is_read && !alert.is_dismissed && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => markAsReadMutation.mutate(alert.id)}
                        disabled={markAsReadMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    {!alert.is_dismissed && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => dismissMutation.mutate(alert.id)}
                        disabled={dismissMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AlertsPanel;