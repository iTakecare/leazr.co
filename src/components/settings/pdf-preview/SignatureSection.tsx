
import React from "react";

interface SignatureSectionProps {
  pageHeight: number;
  scaleFactor?: number;
  signatureData?: string;
  signerName?: string;
  signedAt?: string;
  monthlyPayment?: number;
  signerIp?: string;
}

const SignatureSection: React.FC<SignatureSectionProps> = ({
  pageHeight,
  scaleFactor = 1,
  signatureData,
  signerName,
  signedAt,
  monthlyPayment = 0,
  signerIp
}) => {
  // Calculer la position bottom pour l'espace de signature
  const bottomPosition = 40 * scaleFactor;
  const isOfferSigned = !!signatureData;
  
  // Formater la date de signature si disponible
  const formatDate = (dateString?: string): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);
    } catch (e) {
      return "";
    }
  };

  // Formater le montant
  const formatAmount = (amount: number): string => {
    return amount.toLocaleString('fr-FR');
  };
  
  return (
    <div
      className="absolute left-0 right-0 p-4 border-t"
      style={{
        bottom: `${bottomPosition}px`,
        padding: `${12 * scaleFactor}px`,
        borderTop: `2px solid #E5E7EB`,
        borderColor: "#E5E7EB",
        zIndex: 10,
        backgroundColor: "rgba(255, 255, 255, 0.8)",
      }}
    >
      <h3 
        className="text-center font-bold mb-2" 
        style={{ 
          fontSize: `${16 * scaleFactor}px`,
          color: "#1A2C3A",
        }}
      >
        Signature client
      </h3>
      
      {isOfferSigned ? (
        <div 
          className="flex flex-col items-center"
          style={{ 
            transform: `scale(${scaleFactor})`,
            transformOrigin: "center",
          }}
        >
          <div 
            className="text-center italic text-gray-500 mb-2"
            style={{ fontSize: `${10 * scaleFactor}px` }}
          >
            Bon pour accord pour {formatAmount(monthlyPayment)}€ hors TVA par mois pendant 36 mois
          </div>
          <img 
            src={signatureData} 
            alt="Signature du client" 
            style={{ 
              maxWidth: `${200 * scaleFactor}px`,
              maxHeight: `${80 * scaleFactor}px`,
              border: "1px solid #E5E7EB",
              padding: `${5 * scaleFactor}px`,
              backgroundColor: "white"
            }} 
          />
          <div 
            className="text-center text-gray-500 mt-2"
            style={{ fontSize: `${10 * scaleFactor}px` }}
          >
            Signé électroniquement par {signerName || "le client"}
            {signedAt ? ` le ${formatDate(signedAt)}` : ""}
            {signerIp && <div style={{ fontSize: `${8 * scaleFactor}px` }}>IP: {signerIp}</div>}
          </div>
        </div>
      ) : (
        <div
          className="border border-dashed rounded-md mx-auto flex items-center justify-center"
          style={{
            width: `${300 * scaleFactor}px`,
            height: `${100 * scaleFactor}px`,
            transform: `scale(${scaleFactor})`,
            transformOrigin: "center",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            borderColor: "#94a3b8",
            borderRadius: "8px",
          }}
        >
          <p style={{ 
            color: "#9CA3AF", 
            fontSize: `${10 * scaleFactor}px`, 
            fontStyle: "italic" 
          }}>
            Signature précédée de "Bon pour accord pour {formatAmount(monthlyPayment)}€ hors TVA par mois pendant 36 mois"
          </p>
        </div>
      )}
    </div>
  );
};

export default SignatureSection;
