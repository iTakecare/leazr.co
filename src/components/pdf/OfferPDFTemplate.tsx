
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
    <div style={{ 
      width: '210mm', 
      height: '297mm', 
      margin: '0 auto', 
      fontFamily: 'Arial, sans-serif',
      boxSizing: 'border-box',
      padding: '0',
      position: 'relative'
    }}>
      {/* En-tête */}
      <div style={{ 
        backgroundColor: '#1A2C3A', 
        color: 'white', 
        padding: '15px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center'
      }}>
        <div>
          <img src="/lovable-uploads/7e711eae-90de-40ce-806c-21ffa5c9d7b6.png" alt="iTakecare Logo" style={{ height: '30px' }} />
        </div>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
          OFFRE COMMERCIALE
        </div>
      </div>
      
      {/* Contenu principal */}
      <div style={{ padding: '20px' }}>
        {/* Référence de l'offre */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0' }}>
            RÉFÉRENCE: {offerId}
          </h1>
        </div>
      
        {/* Information client et référence */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '20px', 
          padding: '10px',
          border: '1px solid #e5e7eb',
          borderRadius: '5px'
        }}>
          <div>
            <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>Informations client</h2>
            <p style={{ margin: '5px 0', fontSize: '12px' }}>{offer.client_company || "Client Company"}</p>
            <p style={{ margin: '5px 0', fontSize: '12px' }}>{offer.client_name || "Client Name"}</p>
            <p style={{ margin: '5px 0', fontSize: '12px' }}>{offer.client_email || "client@example.com"}</p>
          </div>
          <div>
            <p style={{ margin: '5px 0', fontSize: '12px' }}>Date: {formatDate(offer.created_at) || "21/03/2025"}</p>
            <p style={{ margin: '5px 0', fontSize: '12px' }}>Validité: 30 jours</p>
          </div>
        </div>
        
        {/* Liste d'équipements */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>Détail des équipements</h2>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e5e7eb', width: '60%' }}>Désignation</th>
                <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #e5e7eb', width: '15%' }}>Qté</th>
                <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #e5e7eb', width: '25%' }}>Mensualité</th>
              </tr>
            </thead>
            <tbody>
              {equipment.length > 0 ? (
                equipment.map((item, index) => (
                  <tr key={index}>
                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{item.title}</td>
                    <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #e5e7eb' }}>{item.quantity}</td>
                    <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #e5e7eb' }}>
                      {formatCurrency(item.monthlyPayment)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>Produit Test</td>
                  <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #e5e7eb' }}>1</td>
                  <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #e5e7eb' }}>90,00 €</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Résumé financier */}
        <div style={{ 
          marginBottom: '30px',
          padding: '15px',
          backgroundColor: '#f9fafb',
          borderRadius: '5px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '14px', margin: '0 0 5px 0' }}>Récapitulatif</h3>
              <p style={{ fontSize: '12px', margin: '0' }}>Engagement sur 36 mois</p>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2563EB' }}>
              {equipment.length > 0 
                ? `${formatCurrency(totalMonthly)} HTVA /mois` 
                : `${formatCurrency(offer.monthly_payment)} HTVA /mois`}
            </div>
          </div>
        </div>
        
        {/* Avantages du leasing */}
        <div style={{ 
          marginBottom: '20px',
          padding: '15px',
          border: '1px solid #e5e7eb',
          borderRadius: '5px'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
            Les avantages de notre solution de leasing
          </h3>
          
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            <div style={{ width: '50%' }}>
              <p style={{ margin: '0 0 5px 0', fontSize: '12px' }}>✓ Optimisation fiscale</p>
              <p style={{ margin: '0 0 5px 0', fontSize: '12px' }}>✓ Préservation de trésorerie</p>
            </div>
            <div style={{ width: '50%' }}>
              <p style={{ margin: '0 0 5px 0', fontSize: '12px' }}>✓ Matériel toujours à jour</p>
              <p style={{ margin: '0 0 5px 0', fontSize: '12px' }}>✓ Service et support inclus</p>
            </div>
          </div>
        </div>
        
        {/* Section signature */}
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '10px', fontSize: '14px' }}>
            Signature client
          </h3>
          <div style={{ 
            width: '200px', 
            height: '80px', 
            border: '1px dashed #ccc', 
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <p style={{ color: '#9ca3af', fontSize: '11px', fontStyle: 'italic' }}>Signature précédée de "Bon pour accord"</p>
          </div>
        </div>
      </div>
      
      {/* Pied de page */}
      <div style={{ 
        position: 'absolute', 
        bottom: '0', 
        left: '0', 
        right: '0', 
        borderTop: '1px solid #e5e7eb', 
        padding: '10px', 
        textAlign: 'center',
        fontSize: '10px',
        color: '#6b7280',
        backgroundColor: '#f9fafb'
      }}>
        <p style={{ margin: '0 0 5px 0' }}>
          Cette offre est valable 30 jours à compter de sa date d'émission.
        </p>
        <p style={{ margin: '0' }}>
          iTakecare - Avenue du Général Michel 1E, 6000 Charleroi, Belgique - TVA: BE 0795.642.894
        </p>
      </div>
    </div>
  );
};

export default OfferPDFTemplate;
