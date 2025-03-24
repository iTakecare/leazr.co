
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
    <div className="bg-white" style={{ width: '100%', minHeight: '100vh', maxWidth: '210mm', margin: '0 auto', position: 'relative' }}>
      {/* Header - Utilisation de la couleur #2C3E50 comme demandé */}
      <header style={{ backgroundColor: '#2C3E50', color: 'white', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/lovable-uploads/7e711eae-90de-40ce-806c-21ffa5c9d7b6.png" alt="iTakecare Logo" style={{ height: '40px' }} />
        </div>
        <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
          VOTRE OFFRE PERSONNALISÉE
        </div>
      </header>
      
      {/* Main Content */}
      <main style={{ padding: '20px' }}>
        {/* Reference Information */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            OFFRE N° {offerId}
          </h1>
        </div>
      
        {/* Client Information and Reference */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '16px' }}>CLIENT</h2>
            <p style={{ fontWeight: '600', margin: '5px 0' }}>{offer.client_company || "ACME BELGIUM SA"}</p>
            <p style={{ margin: '5px 0' }}>{offer.client_name || "Guy Tarre"}</p>
            <p style={{ margin: '5px 0' }}>{offer.client_email || "client@example.com"}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: '5px 0' }}>Date: {formatDate(offer.created_at) || "21/03/2025"}</p>
            <p style={{ margin: '5px 0' }}>Référence: {offerId}</p>
          </div>
        </div>
        
        {/* Equipment List */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '16px' }}>ÉQUIPEMENTS</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f3f4f6' }}>
              <tr>
                <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'left' }}>Désignation</th>
                <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center' }}>Qté</th>
                <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'right' }}>Mensualité</th>
              </tr>
            </thead>
            <tbody>
              {equipment.length > 0 ? (
                equipment.map((item, index) => (
                  <tr key={index}>
                    <td style={{ border: '1px solid #d1d5db', padding: '8px' }}>{item.title}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'right' }}>{formatCurrency(item.monthlyPayment)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={{ border: '1px solid #d1d5db', padding: '8px' }}>Produit Test</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center' }}>1</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'right' }}>90,00 €</td>
                </tr>
              )}
              <tr>
                <td colSpan={2} style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'right', fontWeight: '600' }}>
                  Total mensualité:
                </td>
                <td style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'right', fontWeight: '600' }}>
                  {equipment.length > 0 
                    ? formatCurrency(totalMonthly) 
                    : "90,00 €"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Total Final */}
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#3482F6', fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '100px' }}>
          <p>Total mensualité:</p>
          <p>{equipment.length > 0 
            ? `${formatCurrency(totalMonthly)} HTVA / mois` 
            : "90,00 € HTVA / mois"}</p>
        </div>
      </main>
      
      {/* Footer - Positionnement absolu en bas de la page */}
      <footer style={{ position: 'absolute', bottom: '0', left: '0', right: '0', width: '100%', textAlign: 'center', padding: '20px 0', backgroundColor: 'white' }}>
        <p style={{ fontWeight: '500', marginBottom: '16px' }}>
          Cette offre est valable 30 jours à compter de sa date d'émission.
        </p>
        <hr style={{ borderColor: '#d1d5db', marginBottom: '16px' }} />
        <div style={{ fontSize: '0.875rem', color: '#4b5563' }}>
          <p style={{ margin: '4px 0' }}>
            iTakecare - Avenue du Général Michel 1E, 6000 Charleroi, Belgique
          </p>
          <p style={{ margin: '4px 0' }}>
            TVA: BE 0795.642.894 - Tel: +32 471 511 121 - Email: hello@itakecare.be
          </p>
        </div>
      </footer>
    </div>
  );
};

export default OfferPDFTemplate;
