
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
      padding: '0',
      margin: '0',
      fontFamily: 'Arial, sans-serif',
      boxSizing: 'border-box',
      position: 'relative',
      backgroundColor: 'white',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* En-tête */}
      <div style={{ 
        backgroundColor: '#1A2C3A', 
        color: 'white', 
        padding: '10px 15px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        height: '40px'
      }}>
        <div style={{ height: '25px' }}>
          <img src="/lovable-uploads/7e711eae-90de-40ce-806c-21ffa5c9d7b6.png" alt="iTakecare Logo" style={{ height: '25px' }} />
        </div>
        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
          OFFRE COMMERCIALE
        </div>
      </div>
      
      {/* Contenu principal */}
      <div style={{ padding: '10px 15px', flex: '1', display: 'flex', flexDirection: 'column' }}>
        {/* Référence de l'offre */}
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <h1 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0' }}>
            RÉFÉRENCE: {offerId}
          </h1>
        </div>
      
        {/* Information client et référence */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '10px', 
          padding: '8px',
          border: '1px solid #e5e7eb',
          borderRadius: '3px'
        }}>
          <div>
            <h2 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '3px', marginTop: '0' }}>Informations client</h2>
            <p style={{ margin: '2px 0', fontSize: '11px' }}>{offer.client_company || "Client Company"}</p>
            <p style={{ margin: '2px 0', fontSize: '11px' }}>{offer.client_name || "Client Name"}</p>
            <p style={{ margin: '2px 0', fontSize: '11px' }}>{offer.client_email || "client@example.com"}</p>
          </div>
          <div>
            <p style={{ margin: '2px 0', fontSize: '11px' }}>Date: {formatDate(offer.created_at) || "21/03/2025"}</p>
            <p style={{ margin: '2px 0', fontSize: '11px' }}>Validité: 30 jours</p>
          </div>
        </div>
        
        {/* Liste d'équipements */}
        <div style={{ marginBottom: '10px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', marginTop: '0' }}>Détail des équipements</h2>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #e5e7eb', width: '60%' }}>Désignation</th>
                <th style={{ padding: '6px', textAlign: 'center', border: '1px solid #e5e7eb', width: '10%' }}>Qté</th>
                <th style={{ padding: '6px', textAlign: 'right', border: '1px solid #e5e7eb', width: '30%' }}>Mensualité</th>
              </tr>
            </thead>
            <tbody>
              {equipment.length > 0 ? (
                equipment.map((item, index) => (
                  <tr key={index}>
                    <td style={{ padding: '5px', border: '1px solid #e5e7eb' }}>{item.title}</td>
                    <td style={{ padding: '5px', textAlign: 'center', border: '1px solid #e5e7eb' }}>{item.quantity}</td>
                    <td style={{ padding: '5px', textAlign: 'right', border: '1px solid #e5e7eb' }}>
                      {formatCurrency(item.monthlyPayment)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={{ padding: '5px', border: '1px solid #e5e7eb' }}>Produit Test</td>
                  <td style={{ padding: '5px', textAlign: 'center', border: '1px solid #e5e7eb' }}>1</td>
                  <td style={{ padding: '5px', textAlign: 'right', border: '1px solid #e5e7eb' }}>90,00 €</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Résumé financier */}
        <div style={{ 
          marginBottom: '10px',
          padding: '8px',
          backgroundColor: '#f9fafb',
          borderRadius: '3px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '12px', margin: '0 0 3px 0' }}>Récapitulatif</h3>
              <p style={{ fontSize: '11px', margin: '0' }}>Engagement sur 36 mois</p>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2563EB' }}>
              {equipment.length > 0 
                ? `${formatCurrency(totalMonthly)} HTVA /mois` 
                : `${formatCurrency(offer.monthly_payment)} HTVA /mois`}
            </div>
          </div>
        </div>
        
        {/* Avantages du leasing */}
        <div style={{ 
          marginBottom: '10px',
          padding: '8px',
          border: '1px solid #e5e7eb',
          borderRadius: '3px'
        }}>
          <h3 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px', marginTop: '0' }}>
            Les avantages de notre solution de leasing
          </h3>
          
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            <div style={{ width: '50%' }}>
              <p style={{ margin: '0 0 3px 0', fontSize: '11px' }}>✓ Optimisation fiscale</p>
              <p style={{ margin: '0 0 3px 0', fontSize: '11px' }}>✓ Préservation de trésorerie</p>
            </div>
            <div style={{ width: '50%' }}>
              <p style={{ margin: '0 0 3px 0', fontSize: '11px' }}>✓ Matériel toujours à jour</p>
              <p style={{ margin: '0 0 3px 0', fontSize: '11px' }}>✓ Service et support inclus</p>
            </div>
          </div>
        </div>
        
        {/* Section signature */}
        <div style={{ marginTop: '5px' }}>
          <h3 style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '5px', fontSize: '12px', marginTop: '0' }}>
            Signature client
          </h3>
          <div style={{ 
            width: '180px', 
            height: '70px', 
            border: '1px dashed #ccc', 
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <p style={{ color: '#9ca3af', fontSize: '10px', fontStyle: 'italic' }}>Signature précédée de "Bon pour accord"</p>
          </div>
        </div>
        
        {/* Espace flexible pour éviter les débordements */}
        <div style={{ flex: '1' }}></div>
      </div>
      
      {/* Pied de page - fixé en bas */}
      <div style={{ 
        borderTop: '1px solid #e5e7eb', 
        padding: '5px 10px', 
        textAlign: 'center',
        fontSize: '9px',
        color: '#6b7280',
        marginTop: 'auto'
      }}>
        <p style={{ margin: '0 0 2px 0' }}>
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
