import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wrench, Calendar, AlertTriangle, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getEquipmentMaintenance } from "@/services/inventoryService";

const MaintenanceManagement: React.FC = () => {
  const { data: maintenances = [], isLoading } = useQuery({
    queryKey: ["equipment-maintenance"],
    queryFn: () => getEquipmentMaintenance(),
  });

  const upcomingMaintenance = maintenances.filter((m: any) => 
    m.status === 'scheduled' && new Date(m.scheduled_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );

  const overdueMaintenance = maintenances.filter((m: any) => 
    m.status === 'scheduled' && new Date(m.scheduled_date) < new Date()
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Gestion de la Maintenance</h3>
          <p className="text-sm text-muted-foreground">
            Planifiez et suivez les opérations de maintenance
          </p>
        </div>
        <Button>
          <Wrench className="mr-2 h-4 w-4" />
          Nouvelle Maintenance
        </Button>
      </div>

      {/* Statistiques de maintenance */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Retard</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdueMaintenance.length}</div>
            <p className="text-xs text-muted-foreground">
              Maintenances en retard
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cette Semaine</CardTitle>
            <Calendar className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{upcomingMaintenance.length}</div>
            <p className="text-xs text-muted-foreground">
              À effectuer prochainement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terminées</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {maintenances.filter((m: any) => m.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Ce mois-ci
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Maintenances en retard */}
      {overdueMaintenance.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Maintenances en Retard
            </CardTitle>
            <CardDescription>
              {overdueMaintenance.length} maintenance(s) en retard nécessitent une attention immédiate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overdueMaintenance.map((maintenance: any) => (
                <div key={maintenance.id} className="flex items-center justify-between p-4 bg-destructive/10 rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{maintenance.equipment?.name}</p>
                    <p className="text-sm text-muted-foreground">{maintenance.description}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">
                        {maintenance.maintenance_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Prévu le {new Date(maintenance.scheduled_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button size="sm" variant="destructive">
                    Traiter
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Planning de maintenance */}
      <Card>
        <CardHeader>
          <CardTitle>Planning de Maintenance</CardTitle>
          <CardDescription>
            Toutes les maintenances programmées et en cours
          </CardDescription>
        </CardHeader>
        <CardContent>
          {maintenances.length === 0 ? (
            <div className="text-center py-8">
              <Wrench className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Aucune maintenance programmée</p>
              <Button className="mt-4" variant="outline">
                Programmer une maintenance
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {maintenances.map((maintenance: any) => (
                <div key={maintenance.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{maintenance.equipment?.name}</p>
                      <Badge 
                        variant={
                          maintenance.status === 'completed' ? 'default' :
                          maintenance.status === 'in_progress' ? 'secondary' :
                          maintenance.status === 'cancelled' ? 'destructive' :
                          'outline'
                        }
                      >
                        {maintenance.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{maintenance.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Type: {maintenance.maintenance_type}</span>
                      <span>Prévu: {new Date(maintenance.scheduled_date).toLocaleDateString()}</span>
                      {maintenance.cost > 0 && <span>Coût: {maintenance.cost}€</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline">
                      Modifier
                    </Button>
                    {maintenance.status === 'scheduled' && (
                      <Button size="sm">
                        Commencer
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

export default MaintenanceManagement;