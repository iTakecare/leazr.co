
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useClientOffers } from "@/hooks/useClientOffers";
import { useNavigate } from "react-router-dom";

const ClientRequestsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { offers, loading, error } = useClientOffers(user?.email);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatEquipmentDescription = (description?: string) => {
    if (!description) return 'Équipement non spécifié';
    
    try {
      const equipmentData = JSON.parse(description);
      if (Array.isArray(equipmentData) && equipmentData.length > 0) {
        const titles = equipmentData.map(item => item.title).filter(Boolean);
        if (titles.length > 0) {
          return titles.length > 1 
            ? `${titles[0]} et ${titles.length - 1} autre(s) équipement(s)`
            : titles[0];
        }
      }
    } catch {
      return description;
    }
    return description;
  };

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

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <p>Erreur lors du chargement des demandes : {error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mes Demandes</h1>
        <p className="text-muted-foreground">
          Suivez l'état de vos demandes de financement et de leasing
        </p>
      </div>

      <div className="grid gap-4">
        {offers.map((offer) => {
          const statusInfo = getStatusInfo(offer.status);
          return (
            <Card 
              key={offer.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/client/requests/${offer.id}`)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {statusInfo.icon}
                    <div>
                      <CardTitle className="text-lg">
                        Demande de financement - {formatEquipmentDescription(offer.equipment_description)}
                      </CardTitle>
                      <CardDescription>
                        Soumise le {new Date(offer.created_at).toLocaleDateString('fr-FR')}
                      </CardDescription>
                    </div>
                  </div>
                  {statusInfo.badge}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Mensualité</p>
                    <p className="text-lg font-semibold">{formatAmount(offer.monthly_payment)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Type</p>
                    <p className="text-sm">
                      {offer.type === 'client_request' ? 'Demande client' : 'Offre admin'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {offers.length === 0 && (
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
