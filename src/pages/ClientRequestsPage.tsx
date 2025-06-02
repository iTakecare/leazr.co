
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react";

const ClientRequestsPage = () => {
  // Mock data for demonstration
  const requests = [
    {
      id: "1",
      title: "Demande de financement - MacBook Pro",
      status: "pending",
      submittedDate: "2024-01-20",
      amount: "2,499€",
      description: "MacBook Pro M3 16' pour développement"
    },
    {
      id: "2",
      title: "Demande de leasing - Équipement bureau",
      status: "approved",
      submittedDate: "2024-01-15",
      amount: "1,500€",
      description: "Mobilier de bureau ergonomique"
    },
    {
      id: "3",
      title: "Demande de financement - Serveur",
      status: "rejected",
      submittedDate: "2024-01-10",
      amount: "5,000€",
      description: "Serveur Dell PowerEdge pour infrastructure"
    }
  ];

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          badge: <Badge variant="outline" className="border-orange-300 text-orange-600">En attente</Badge>,
          icon: <Clock className="h-5 w-5 text-orange-500" />
        };
      case 'approved':
        return {
          badge: <Badge variant="default" className="bg-green-500">Approuvée</Badge>,
          icon: <CheckCircle className="h-5 w-5 text-green-500" />
        };
      case 'rejected':
        return {
          badge: <Badge variant="destructive">Rejetée</Badge>,
          icon: <XCircle className="h-5 w-5 text-red-500" />
        };
      case 'under_review':
        return {
          badge: <Badge variant="secondary">En révision</Badge>,
          icon: <AlertCircle className="h-5 w-5 text-blue-500" />
        };
      default:
        return {
          badge: <Badge variant="secondary">{status}</Badge>,
          icon: <Clock className="h-5 w-5 text-gray-500" />
        };
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mes Demandes</h1>
        <p className="text-muted-foreground">
          Suivez l'état de vos demandes de financement et de leasing
        </p>
      </div>

      <div className="grid gap-4">
        {requests.map((request) => {
          const statusInfo = getStatusInfo(request.status);
          return (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {statusInfo.icon}
                    <div>
                      <CardTitle className="text-lg">{request.title}</CardTitle>
                      <CardDescription>
                        Soumise le {new Date(request.submittedDate).toLocaleDateString('fr-FR')}
                      </CardDescription>
                    </div>
                  </div>
                  {statusInfo.badge}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Montant demandé</p>
                    <p className="text-lg font-semibold">{request.amount}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p className="text-sm">{request.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {requests.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune demande</h3>
            <p className="text-muted-foreground text-center">
              Vous n'avez pas encore soumis de demandes de financement.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientRequestsPage;
