import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, CheckCircle, AlertCircle, XCircle, FileText } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useClientOffers } from "@/hooks/useClientOffers";

const ClientRequestDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { offers, loading, error } = useClientOffers(user?.email);

  const offer = offers.find(o => o.id === id);

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
        return equipmentData.map(item => item.title).filter(Boolean);
      }
    } catch {
      return [description];
    }
    return [description];
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
      case 'sent':
        return {
          badge: <Badge variant="outline" className="border-blue-300 text-blue-600">Envoyée</Badge>,
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
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <p>{error || "Demande introuvable"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = getStatusInfo(offer.status);
  const equipmentList = formatEquipmentDescription(offer.equipment_description);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/client/requests')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Détail de la demande</h1>
          <p className="text-muted-foreground">
            Informations détaillées de votre demande de financement
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Informations principales */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {statusInfo.icon}
                  <div>
                    <CardTitle>Demande de financement</CardTitle>
                    <CardDescription>
                      Soumise le {new Date(offer.created_at).toLocaleDateString('fr-FR')}
                    </CardDescription>
                  </div>
                </div>
                {statusInfo.badge}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Mensualité</p>
                  <p className="text-2xl font-bold">{formatAmount(offer.monthly_payment)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Type de demande</p>
                  <p className="text-lg">
                    {offer.type === 'client_request' ? 'Demande client' : 'Offre admin'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Équipements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Équipements demandés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.isArray(equipmentList) ? (
                  equipmentList.map((equipment, index) => (
                    <div key={index} className="p-3 bg-muted/50 rounded-lg">
                      <p className="font-medium">{equipment}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium">{equipmentList}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar avec informations supplémentaires */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations de la demande</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">ID de la demande</p>
                <p className="text-sm font-mono">{offer.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Client</p>
                <p className="text-sm">{offer.client_name}</p>
              </div>
              {offer.client_email && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm">{offer.client_email}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date de création</p>
                <p className="text-sm">{new Date(offer.created_at).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
              {offer.coefficient && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Coefficient</p>
                  <p className="text-sm">{offer.coefficient}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          {offer.status === 'sent' && (
            <Card>
              <CardHeader>
                <CardTitle>Actions disponibles</CardTitle>
              </CardHeader>
              <CardContent>
                <Button className="w-full">
                  Consulter l'offre
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientRequestDetailPage;