
import React from "react";
import { formatCurrency } from "@/utils/formatters";

interface EquipmentItem {
  title: string;
  purchasePrice: number;
  quantity: number;
  monthlyPayment: number;
}

interface OfferPDFTemplateProps {
  offer: {
    id: string;
    offer_id?: string;
    client_name: string;
    client_company?: string;
    client_email?: string;
    created_at: string;
    equipment_description: string;
    monthly_payment: number;
  };
}

const parseEquipmentData = (jsonString: string): EquipmentItem[] => {
  try {
    if (!jsonString) return [];
    
    if (typeof jsonString === 'object' && Array.isArray(jsonString)) {
      return jsonString;
    }
    
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error parsing equipment data:", error);
    return [];
  }
};

const formatDate = (dateString: string): string => {
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

const OfferPDFTemplate: React.FC<OfferPDFTemplateProps> = ({ offer }) => {
  const equipment = parseEquipmentData(offer.equipment_description);
  const offerId = offer.offer_id || `OFF-${offer.id?.substring(0, 8).toUpperCase()}`;
  
  const totalMonthly = equipment.reduce((sum, item) => {
    return sum + (item.monthlyPayment * item.quantity);
  }, 0);
  
  return (
    <div className="bg-white w-full" style={{ minHeight: '297mm', maxHeight: '297mm', overflow: 'hidden' }}>
      {/* Header */}
      <header className="bg-[#1A1F2C] text-white p-6 flex justify-between items-center">
        <div className="flex items-center">
          <img src="/lovable-uploads/cfcad882-24c1-45af-9bef-f2f1f38a8bcd.png" alt="Logo" className="h-10 mr-2" />
        </div>
        <div className="text-xl font-bold">
          OFFRE N° {offerId}
        </div>
      </header>
      
      {/* Main Content */}
      <main className="p-8 flex flex-col">
        {/* Client Information and Reference */}
        <div className="flex justify-between mb-10">
          <div>
            <h2 className="text-lg font-bold mb-4">CLIENT</h2>
            <p className="font-semibold">{offer.client_company || "ACME BELGIUM SA"}</p>
            <p>{offer.client_name || "Guy Tarre"}</p>
            <p>{offer.client_email || "client@example.com"}</p>
          </div>
          <div className="text-right">
            <p>Date: {formatDate(offer.created_at) || "21/03/2025"}</p>
            <p>Référence: {offerId}</p>
          </div>
        </div>
        
        {/* Equipment List */}
        <div className="mb-10">
          <h2 className="text-lg font-bold mb-4">ÉQUIPEMENTS</h2>
          <table className="w-full border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 p-2 text-left">Désignation</th>
                <th className="border border-gray-300 p-2 text-center">Qté</th>
                <th className="border border-gray-300 p-2 text-right">Mensualité</th>
              </tr>
            </thead>
            <tbody>
              {equipment.length > 0 ? (
                equipment.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 p-2">{item.title}</td>
                    <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                    <td className="border border-gray-300 p-2 text-right">{formatCurrency(item.monthlyPayment)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="border border-gray-300 p-2">Produit Test</td>
                  <td className="border border-gray-300 p-2 text-center">1</td>
                  <td className="border border-gray-300 p-2 text-right">90,00 €</td>
                </tr>
              )}
              <tr>
                <td colSpan={2} className="border border-gray-300 p-2 text-right font-semibold">
                  Total mensualité:
                </td>
                <td className="border border-gray-300 p-2 text-right font-semibold">
                  {equipment.length > 0 
                    ? formatCurrency(totalMonthly) 
                    : "90,00 €"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Total Final */}
        <div className="flex justify-between text-blue-600 font-bold text-lg mb-20">
          <p>Total mensualité:</p>
          <p>{equipment.length > 0 
            ? `${formatCurrency(totalMonthly)} HTVA / mois` 
            : "90,00 € HTVA / mois"}</p>
        </div>
        
        {/* Blank space to ensure footer stays at bottom */}
        <div className="flex-grow" style={{ minHeight: '80px' }}></div>
      </main>
      
      {/* Footer */}
      <footer style={{ position: 'relative', paddingTop: '20px', maxWidth: '100%' }}>
        <p className="text-center font-medium mb-4">
          Cette offre est valable 30 jours à compter de sa date d'émission.
        </p>
        <hr className="border-gray-300 mb-4" />
        <div className="text-center text-sm text-gray-600" style={{ paddingBottom: '20px' }}>
          <p>
            iTakecare - Avenue du Général Michel 1E, 6000 Charleroi, Belgique
          </p>
          <p>
            TVA: BE 0795.642.894 - Tel: +32 471 511 121 - Email: hello@itakecare.be
          </p>
        </div>
      </footer>
    </div>
  );
};

export default OfferPDFTemplate;
