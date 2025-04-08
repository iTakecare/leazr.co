
import React from "react";
import { formatCurrency } from "@/utils/formatters";
import PDFFooter from "../settings/pdf-preview/PDFFooter";
import SignatureSection from "../settings/pdf-preview/SignatureSection";

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
    <div className="bg-white" style={{ 
      width: '100%', 
      height: '100%', 
      position: 'relative', 
      fontFamily: 'Arial, sans-serif',
      boxSizing: 'border-box',
      margin: 0,
      padding: 0
    }}>
      {/* En-tête */}
      <header style={{ 
        background: 'linear-gradient(to right, #1A2C3A, #2C4356)', 
        color: 'white', 
        padding: '20px 30px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '3px solid #FFB74D'
      }}>
        <div>
          <img 
            src="/lovable-uploads/7e711eae-90de-40ce-806c-21ffa5c9d7b6.png" 
            alt="iTakecare Logo" 
            style={{ height: '40px' }} 
          />
        </div>
        <div style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          letterSpacing: '1px',
          textTransform: 'uppercase'
        }}>
          OFFRE COMMERCIALE
        </div>
      </header>
      
      {/* Contenu principal */}
      <main style={{ 
        padding: '30px',
        backgroundColor: '#FFFFFF',
        minHeight: 'calc(100% - 240px)'
      }}>
        {/* Référence et date */}
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '30px'
        }}>
          <div style={{ 
            padding: '15px',
            backgroundColor: '#1A2C3A',
            color: 'white',
            borderRadius: '6px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ margin: '0', fontSize: '20px' }}>
              {formatDate(offer.created_at)}
            </h2>
          </div>
          <div style={{ 
            padding: '15px',
            backgroundColor: '#F3F4F6',
            borderRadius: '6px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
          }}>
            <h2 style={{ margin: '0', fontSize: '20px', color: '#1A2C3A' }}>
              RÉF: {offerId}
            </h2>
          </div>
        </div>
        
        {/* Information client */}
        <div style={{ 
          marginBottom: '30px', 
          padding: '20px',
          background: '#F9FAFB', 
          borderRadius: '8px',
          border: '1px solid #E5E7EB'
        }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: 'bold', 
            marginTop: '0',
            marginBottom: '15px', 
            color: '#1A2C3A', 
            textTransform: 'uppercase',
            borderBottom: '2px solid #E5E7EB',
            paddingBottom: '8px' 
          }}>Client</h2>
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <p style={{ 
                fontWeight: '600', 
                margin: '5px 0', 
                fontSize: '16px', 
                color: '#4B5563' 
              }}>
                {offer.client_company || "Client Company"}
              </p>
              <p style={{ 
                margin: '5px 0', 
                fontSize: '14px', 
                color: '#6B7280' 
              }}>
                {offer.client_name || "Client Name"}
              </p>
              <p style={{ 
                margin: '5px 0', 
                fontSize: '14px', 
                color: '#6B7280' 
              }}>
                {offer.client_email || "client@example.com"}
              </p>
            </div>
          </div>
        </div>
        
        {/* Liste d'équipements */}
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: 'bold', 
            marginBottom: '15px', 
            color: '#1A2C3A', 
            textTransform: 'uppercase',
            borderBottom: '2px solid #E5E7EB',
            paddingBottom: '8px'
          }}>
            Détail des équipements
          </h2>
          
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            fontSize: '14px',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#1A2C3A', color: 'white' }}>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Désignation</th>
                <th style={{ padding: '12px 15px', textAlign: 'center', width: '70px' }}>Qté</th>
                <th style={{ padding: '12px 15px', textAlign: 'right', width: '120px' }}>Mensualité</th>
              </tr>
            </thead>
            <tbody>
              {equipment.length > 0 ? (
                equipment.map((item, index) => (
                  <tr key={index} style={{ 
                    backgroundColor: index % 2 === 0 ? '#F9FAFB' : '#FFFFFF',
                    borderBottom: '1px solid #E5E7EB'
                  }}>
                    <td style={{ padding: '10px 15px' }}>{item.title}</td>
                    <td style={{ padding: '10px 15px', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '10px 15px', textAlign: 'right', fontWeight: 500 }}>
                      {formatCurrency(item.monthlyPayment * item.quantity)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr style={{ backgroundColor: '#F9FAFB' }}>
                  <td style={{ padding: '10px 15px' }}>Produit Test</td>
                  <td style={{ padding: '10px 15px', textAlign: 'center' }}>1</td>
                  <td style={{ padding: '10px 15px', textAlign: 'right', fontWeight: 500 }}>90,00 €</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Résumé financier */}
        <div style={{ 
          marginBottom: '40px',
          padding: '20px',
          backgroundColor: '#F3F4F6',
          borderRadius: '8px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '16px', margin: '0 0 5px 0', color: '#1A2C3A' }}>Récapitulatif</h3>
              <p style={{ fontSize: '14px', margin: '0', color: '#6B7280' }}>Engagement sur 36 mois</p>
            </div>
            <div style={{ 
              fontSize: '18px', 
              fontWeight: 'bold', 
              color: '#2563EB', 
              backgroundColor: 'white',
              padding: '12px 20px',
              borderRadius: '6px',
              border: '1px solid #E5E7EB'
            }}>
              {equipment.length > 0 
                ? `${formatCurrency(totalMonthly)} HTVA /mois` 
                : "90,00 € HTVA /mois"}
            </div>
          </div>
        </div>
        
        {/* Avantages du leasing */}
        <div style={{ 
          marginBottom: '30px',
          padding: '20px',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          backgroundColor: '#FAFAFA'
        }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 'bold', 
            marginTop: '0',
            marginBottom: '15px', 
            color: '#1A2C3A', 
            textTransform: 'uppercase'
          }}>
            Les avantages de notre solution de leasing
          </h3>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
            <div style={{ flex: '1 1 45%', minWidth: '200px' }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: '600', fontSize: '14px', color: '#4B5563' }}>
                ✓ Optimisation fiscale
              </p>
              <p style={{ margin: '0 0 8px 0', fontWeight: '600', fontSize: '14px', color: '#4B5563' }}>
                ✓ Préservation de trésorerie
              </p>
            </div>
            <div style={{ flex: '1 1 45%', minWidth: '200px' }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: '600', fontSize: '14px', color: '#4B5563' }}>
                ✓ Matériel toujours à jour
              </p>
              <p style={{ margin: '0 0 8px 0', fontWeight: '600', fontSize: '14px', color: '#4B5563' }}>
                ✓ Service et support inclus
              </p>
            </div>
          </div>
        </div>
        
        {/* Section signature avec positionnement fixe */}
        <div style={{ marginTop: '40px' }}>
          <SignatureSection pageHeight={0} scaleFactor={1} />
        </div>
      </main>
      
      {/* Pied de page */}
      <PDFFooter 
        pageNumber={1} 
        totalPages={1} 
        zoomLevel={1}
      />
    </div>
  );
};

export default OfferPDFTemplate;
