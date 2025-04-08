
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
      {/* Header - Background bleu foncé avec le texte en blanc */}
      <header style={{ backgroundColor: '#1A2C3A', color: 'white', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/lovable-uploads/7e711eae-90de-40ce-806c-21ffa5c9d7b6.png" alt="iTakecare Logo" style={{ height: '28px' }} />
        </div>
        <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
          VOTRE OFFRE PERSONNALISÉE
        </div>
      </header>
      
      {/* Main Content */}
      <main style={{ padding: '15px 20px' }}>
        {/* Reference Information */}
        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
          <h1 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '5px 0' }}>
            OFFRE N° {offerId}
          </h1>
        </div>
      
        {/* Client Information and Reference - Plus petit et plus compact */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px' }}>CLIENT</h2>
            <p style={{ fontWeight: '600', margin: '3px 0', fontSize: '0.8rem' }}>{offer.client_company || "ACME BELGIUM SA"}</p>
            <p style={{ margin: '3px 0', fontSize: '0.8rem' }}>{offer.client_name || "Guy Tarre"}</p>
            <p style={{ margin: '3px 0', fontSize: '0.8rem' }}>{offer.client_email || "client@example.com"}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: '3px 0', fontSize: '0.8rem' }}>Date: {formatDate(offer.created_at) || "21/03/2025"}</p>
            <p style={{ margin: '3px 0', fontSize: '0.8rem' }}>Référence: {offerId}</p>
          </div>
        </div>
        
        {/* Equipment List */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px' }}>ÉQUIPEMENTS</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead style={{ backgroundColor: '#f3f4f6' }}>
              <tr>
                <th style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'left' }}>Désignation</th>
                <th style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'center', width: '70px' }}>Qté</th>
                <th style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'right', width: '120px' }}>Mensualité</th>
              </tr>
            </thead>
            <tbody>
              {equipment.length > 0 ? (
                equipment.map((item, index) => (
                  <tr key={index}>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 6px' }}>{item.title}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'right' }}>{formatCurrency(item.monthlyPayment)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={{ border: '1px solid #d1d5db', padding: '4px 6px' }}>Produit Test</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'center' }}>1</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'right' }}>90,00 €</td>
                </tr>
              )}
              <tr style={{ fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                <td colSpan={2} style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'right' }}>
                  Total mensualité:
                </td>
                <td style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'right' }}>
                  {equipment.length > 0 
                    ? formatCurrency(totalMonthly) 
                    : "90,00 €"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Total Final - Bleu avec format "/mois" - placé directement sous le tableau */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', color: '#2563EB', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '30px' }}>
          <p>
            {equipment.length > 0 
              ? `Total mensualité: ${formatCurrency(totalMonthly)} HTVA /mois` 
              : "Total mensualité: 90,00 € HTVA /mois"}
          </p>
        </div>
        
        {/* Section signature */}
        <div style={{ marginTop: '60px', borderTop: '1px solid #e5e7eb', paddingTop: '15px' }}>
          <h3 style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '10px', fontSize: '0.85rem' }}>
            Signature client
          </h3>
          <div style={{ 
            width: '300px', 
            height: '100px', 
            border: '1px dashed #94a3b8', 
            borderRadius: '4px', 
            margin: '0 auto'
          }}></div>
        </div>
      </main>
      
      {/* Footer au bas de la page */}
      <footer style={{ position: 'absolute', bottom: '0', left: '0', right: '0', width: '100%', textAlign: 'center', padding: '15px 0', borderTop: '1px solid #d1d5db' }}>
        <p style={{ fontWeight: '500', marginBottom: '14px', fontSize: '0.8rem' }}>
          Cette offre est valable 30 jours à compter de sa date d'émission.
        </p>
        <div style={{ fontSize: '0.7rem', color: '#4b5563' }}>
          <p style={{ margin: '2px 0' }}>
            iTakecare - Avenue du Général Michel 1E, 6000 Charleroi, Belgique
          </p>
          <p style={{ margin: '2px 0' }}>
            TVA: BE 0795.642.894 - Tel: +32 471 511 121 - Email: hello@itakecare.be
          </p>
        </div>
      </footer>
    </div>
  );
};

export default OfferPDFTemplate;
