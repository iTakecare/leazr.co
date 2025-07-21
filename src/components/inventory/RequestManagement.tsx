import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getEquipmentRequests } from "@/services/inventoryService";

const RequestManagement: React.FC = () => {
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["equipment-requests"],
    queryFn: getEquipmentRequests,
  });

  const pendingRequests = requests.filter((r: any) => r.status === 'pending');
  const approvedRequests = requests.filter((r: any) => r.status === 'approved');
  const inProgressRequests = requests.filter((r: any) => r.status === 'in_progress');

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'high':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
      in_progress: 'outline',
      completed: 'default',
    };
    return variants[status as keyof typeof variants] || 'secondary';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: 'En attente',
      approved: 'Approuvée',
      rejected: 'Rejetée',
      in_progress: 'En cours',
      completed: 'Terminée',
    };
    return labels[status as keyof typeof labels] || status;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
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
          <h3 className="text-lg font-semibold">Gestion des Demandes</h3>
          <p className="text-sm text-muted-foreground">
            Suivez et gérez les demandes d'équipement et de maintenance
          </p>
        </div>
        <Button>
          <FileText className="mr-2 h-4 w-4" />
          Nouvelle Demande
        </Button>
      </div>

      {/* Statistiques des demandes */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Attente</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{pendingRequests.length}</div>
            <p className="text-xs text-muted-foreground">
              Nécessitent approbation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approuvées</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{approvedRequests.length}</div>
            <p className="text-xs text-muted-foreground">
              Prêtes à traiter
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Cours</CardTitle>
            <AlertCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{inProgressRequests.length}</div>
            <p className="text-xs text-muted-foreground">
              En traitement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
            <p className="text-xs text-muted-foreground">
              Toutes demandes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Demandes urgentes */}
      {requests.some((r: any) => r.priority === 'urgent' && r.status === 'pending') && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Demandes Urgentes
            </CardTitle>
            <CardDescription>
              Demandes nécessitant une attention immédiate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {requests
                .filter((r: any) => r.priority === 'urgent' && r.status === 'pending')
                .map((request: any) => (
                  <div key={request.id} className="flex items-center justify-between p-4 bg-destructive/10 rounded-lg">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{request.title}</p>
                        <Badge variant="destructive" className="text-xs">
                          {request.request_type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{request.description}</p>
                      <div className="text-xs text-muted-foreground">
                        Demandé par: {request.requester?.first_name} {request.requester?.last_name}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="destructive">
                        Rejeter
                      </Button>
                      <Button size="sm">
                        Approuver
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des demandes */}
      <Card>
        <CardHeader>
          <CardTitle>Toutes les Demandes</CardTitle>
          <CardDescription>
            {requests.length} demande(s) au total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Aucune demande trouvée</p>
              <Button className="mt-4" variant="outline">
                Créer une demande
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request: any) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      {getPriorityIcon(request.priority)}
                      <p className="font-medium">{request.title}</p>
                      <Badge variant={getStatusBadge(request.status) as any}>
                        {getStatusLabel(request.status)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {request.request_type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{request.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Demandé par: {request.requester?.first_name} {request.requester?.last_name}</span>
                      <span>Le: {new Date(request.created_at).toLocaleDateString()}</span>
                      {request.estimated_cost && <span>Coût estimé: {request.estimated_cost}€</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline">
                      Détails
                    </Button>
                    {request.status === 'pending' && (
                      <>
                        <Button size="sm" variant="destructive">
                          Rejeter
                        </Button>
                        <Button size="sm">
                          Approuver
                        </Button>
                      </>
                    )}
                    {request.status === 'approved' && (
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

export default RequestManagement;