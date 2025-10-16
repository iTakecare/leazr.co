
import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useClientOffer } from "@/hooks/offers/useClientOffer";
import { useCompanyBranding } from "@/context/CompanyBrandingContext";
import ClientOffersSidebar from "@/components/offers/ClientOffersSidebar";
import LoadingState from "@/components/offers/LoadingState";
import ErrorState from "@/components/offers/ErrorState";
import OfferHeader from "@/components/offers/OfferHeader";
import SignedAlert from "@/components/offers/SignedAlert";
import ClientInformation from "@/components/offers/ClientInformation";
import ClientEquipmentSection from "@/components/offers/ClientEquipmentSection";
import SignatureSection from "@/components/offers/SignatureSection";

const SignOffer = () => {
  const { id } = useParams<{ id: string }>();
  
  // Safely get branding context - it might not be available
  let branding = null;
  try {
    const brandingContext = useCompanyBranding();
    branding = brandingContext?.branding;
  } catch (error) {
    console.log("SignOffer - No branding context available, continuing without branding");
  }
  
  console.log("SignOffer - Component loaded");
  console.log("SignOffer - Offer ID from params:", id);
  console.log("SignOffer - Current URL:", window.location.href);
  
  const {
    offer,
    loading,
    error,
    signerName,
    setSignerName,
    isSigning,
    signed,
    signature,
    debugInfo,
    handleSignature,
    clientIp
  } = useClientOffer(id);
  
  console.log("SignOffer - Hook results:", {
    offer: !!offer,
    loading,
    error,
    signed,
    debugInfo
  });
  
  // Log debugging information to console
  useEffect(() => {
    console.log("SignOffer - useEffect triggered");
    if (debugInfo) {
      console.log("Debug info:", debugInfo);
    }
    
    if (offer) {
      console.log("Offer data loaded:", {
        id: offer.id,
        client_name: offer.client_name,
        hasEquipmentData: !!offer.equipment_description,
        equipmentDataType: offer.equipment_description ? typeof offer.equipment_description : 'none',
        monthlyPayment: offer.monthly_payment,
        signerIp: offer.signer_ip
      });
    }
  }, [debugInfo, offer]);
  
  console.log("SignOffer - About to render, loading:", loading, "error:", error, "offer:", !!offer);
  
  if (loading) {
    console.log("SignOffer - Rendering loading state");
    return <LoadingState />;
  }
  
  if (error || !offer) {
    console.log("SignOffer - Rendering error state", { error, hasOffer: !!offer });
    return <ErrorState error={error || "Cette offre n'existe pas ou n'est plus disponible."} debugInfo={debugInfo} />;
  }
  
  console.log("SignOffer - Rendering main content");
  
  return (
    <div className="bg-gray-50 flex flex-col md:flex-row">
      {/* Client Offers Sidebar */}
      <ClientOffersSidebar currentOfferId={id || ''} clientEmail={offer.client_email} />
      
      {/* Main Content */}
      <div className="flex-1">
        <div className="py-4 md:py-8 px-4 md:px-6 pb-20">
          <div className="max-w-4xl mx-auto">
            {/* Mobile spacing to account for the menu button */}
            <div className="h-10 md:hidden"></div>
            
            {/* Logo de l'entreprise */}
            {branding?.logo_url && (
              <div className="text-center mb-8 bg-white p-6 rounded-lg shadow-sm">
                <img 
                  src={branding.logo_url} 
                  alt="Logo entreprise" 
                  className="h-20 md:h-24 mx-auto object-contain"
                />
              </div>
            )}
            
            <OfferHeader 
              offerId={id || ''} 
              signed={signed}
            />
            
            {signed && (
              <SignedAlert 
                signerName={offer.signer_name} 
                signedAt={offer.signed_at}
                signerIp={offer.signer_ip || clientIp} 
              />
            )}
            
            <ClientInformation 
              clientName={offer.client_name} 
              clientEmail={offer.client_email} 
              clientCompany={offer.clients?.company} 
            />
            
            <ClientEquipmentSection offer={offer} />
            
            <SignatureSection 
              signed={signed}
              signature={signature}
              signerName={signerName}
              setSignerName={setSignerName}
              isSigning={isSigning}
              signedAt={offer.signed_at}
              signerIp={offer.signer_ip || clientIp}
              onSign={handleSignature}
              monthlyPayment={offer.monthly_payment}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignOffer;
