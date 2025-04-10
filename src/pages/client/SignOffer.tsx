
import React from "react";
import { useParams } from "react-router-dom";
import { useClientOffer } from "@/hooks/offers/useClientOffer";
import { formatEquipmentDisplay } from "@/utils/equipmentFormatter";
import ClientOffersSidebar from "@/components/offers/ClientOffersSidebar";
import LoadingState from "@/components/offers/LoadingState";
import ErrorState from "@/components/offers/ErrorState";
import OfferHeader from "@/components/offers/OfferHeader";
import SignedAlert from "@/components/offers/SignedAlert";
import ClientInformation from "@/components/offers/ClientInformation";
import EquipmentDisplay from "@/components/offers/EquipmentDisplay";
import SignatureSection from "@/components/offers/SignatureSection";

const SignOffer = () => {
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
    debugInfo,
    handleSignature,
    handlePrintPdf
  } = useClientOffer(id);
  
  if (loading) {
    return <LoadingState />;
  }
  
  if (error || !offer) {
    return <ErrorState error={error || "Cette offre n'existe pas ou n'est plus disponible."} debugInfo={debugInfo} />;
  }
  
  const equipmentDisplay = formatEquipmentDisplay(offer.equipment_description);
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Client Offers Sidebar - Hidden on mobile, shown on tablet and up */}
      <div className="hidden md:block">
        <ClientOffersSidebar currentOfferId={id || ''} clientEmail={offer.client_email} />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 py-4 md:py-8 px-3 md:px-4 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <OfferHeader 
            offerId={id || ''} 
            signed={signed} 
            isPrintingPdf={isPrintingPdf} 
            onPrintPdf={handlePrintPdf} 
          />
          
          {signed && (
            <SignedAlert 
              signerName={offer.signer_name} 
              signedAt={offer.signed_at} 
            />
          )}
          
          <ClientInformation 
            clientName={offer.client_name} 
            clientEmail={offer.client_email} 
            clientCompany={offer.clients?.company} 
          />
          
          <EquipmentDisplay 
            equipmentDisplay={equipmentDisplay} 
            monthlyPayment={offer.monthly_payment} 
            remarks={offer.remarks} 
          />
          
          <SignatureSection 
            signed={signed}
            signature={signature}
            signerName={signerName}
            setSignerName={setSignerName}
            isSigning={isSigning}
            signedAt={offer.signed_at}
            onSign={handleSignature}
            isPrintingPdf={isPrintingPdf}
            onPrintPdf={handlePrintPdf}
          />
        </div>
      </div>
    </div>
  );
};

export default SignOffer;
