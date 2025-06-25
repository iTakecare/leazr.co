
import React from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOfferDetail } from "@/hooks/offers/useOfferDetail";
import WorkflowStepper from "@/components/offers/detail/WorkflowStepper";
import FinancialSection from "@/components/offers/detail/FinancialSection";
import ClientSection from "@/components/offers/detail/ClientSection";
import EquipmentSection from "@/components/offers/detail/EquipmentSection";
import OfferCompleteHistory from "@/components/offers/OfferCompleteHistory";
import { Loader2, AlertCircle } from "lucide-react";

const AdminOfferDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { offer, loading, error } = useOfferDetail(id || "");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-lg">Chargement de l'offre...</span>
        </div>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="text-xl font-semibold text-red-600">
              Erreur de chargement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-center">
              {error || "Impossible de charger les détails de l'offre"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 space-y-6 max-w-7xl">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Détail de l'offre #{offer.id}
              </h1>
              <p className="text-gray-600">
                Client: {offer.client_name} • Créée le {new Date(offer.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
          
          <WorkflowStepper currentStatus={offer.status} />
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="financial">Financier</TabsTrigger>
            <TabsTrigger value="equipment">Équipements</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ClientSection offer={offer} />
              <FinancialSection offer={offer} />
            </div>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <FinancialSection offer={offer} />
          </TabsContent>

          <TabsContent value="equipment" className="space-y-6">
            <EquipmentSection offer={offer} />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <OfferCompleteHistory offerId={offer.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminOfferDetail;
