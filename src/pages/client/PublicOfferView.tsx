
import React from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useClientOffer } from "@/hooks/offers/useClientOffer";
import ClientInformation from "@/components/offers/ClientInformation";
import EquipmentDisplay from "@/components/offers/EquipmentDisplay";
import SignatureSection from "@/components/offers/SignatureSection";
import SignedAlert from "@/components/offers/SignedAlert";
import { formatEquipmentDisplay } from "@/utils/equipmentFormatter";
import EquipmentDetailTable from "@/components/offers/EquipmentDetailTable";

const PublicOfferView = () => {
  const { id } = useParams<{ id: string }>();
  
  const {
    offer,
    loading,
    error,
    signerName,
    setSignerName,
    isSigning,
    signed,
    signature,
    isPrintingPdf,
    handleSignature,
    handlePrintPdf
  } = useClientOffer(id);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Chargement de l'offre...</span>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-3xl mx-auto">
          <CardHeader className="bg-red-50">
            <CardTitle className="text-red-600">Erreur</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-gray-700">
              {error || "Cette offre n'existe pas ou n'est plus disponible."}
            </p>
            <Button 
              className="mt-4" 
              variant="outline" 
              onClick={() => window.location.href = '/'}
            >
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Parse equipment if available
  const renderEquipmentDetails = () => {
    // Check for parsed equipment
    if (offer.parsedEquipment && offer.parsedEquipment.length > 0) {
      return (
        <EquipmentDetailTable 
          equipment={offer.parsedEquipment}
          totalMonthly={offer.monthly_payment || 0}
          totalMargin={offer.margin || 0}
        />
      );
    }
    
    // Fallback to traditional equipment display
    if (offer.equipment_description) {
      return (
        <EquipmentDisplay 
          equipmentDisplay={formatEquipmentDisplay(offer.equipment_description)}
          monthlyPayment={offer.monthly_payment || 0}
          remarks={offer.remarks}
        />
      );
    }
    
    return null;
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <Card className="mb-6 overflow-hidden">
          <CardHeader className="bg-primary text-primary-foreground">
            <CardTitle>Offre {offer.id.substring(0, 8)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {signed && <SignedAlert />}

              <ClientInformation 
                clientName={offer.client_name}
                clientEmail={offer.client_email || offer.clients?.email}
                clientCompany={offer.clients?.company}
              />

              <Card className="overflow-hidden">
                <CardHeader className="bg-primary/5">
                  <CardTitle>Détails de l'offre</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-500">Prix total</p>
                      <p className="text-2xl font-semibold">{offer.amount?.toLocaleString('fr-FR')} €</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Mensualité</p>
                      <p className="text-2xl font-semibold">{offer.monthly_payment?.toLocaleString('fr-FR')} €</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {renderEquipmentDetails()}

              {!signed && (
                <SignatureSection
                  signed={signed}
                  signature={signature}
                  signerName={signerName}
                  setSignerName={setSignerName}
                  isSigning={isSigning}
                  onSign={handleSignature}
                  isPrintingPdf={isPrintingPdf}
                  onPrintPdf={handlePrintPdf}
                />
              )}

              <div className="flex justify-end mt-6 space-x-3">
                <Button
                  variant="outline"
                  onClick={handlePrintPdf}
                  disabled={isPrintingPdf || isSigning}
                >
                  {isPrintingPdf ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Génération du PDF...
                    </>
                  ) : (
                    "Télécharger en PDF"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicOfferView;
