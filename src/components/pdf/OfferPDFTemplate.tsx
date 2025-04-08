
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
    <div style={{ 
      width: '210mm', 
      minHeight: '297mm',
      margin: '0',
      padding: '0',
      backgroundColor: 'white',
      position: 'relative',
      fontFamily: 'Arial, sans-serif',
      color: '#1A2C3A',
      boxSizing: 'border-box'
    }}>
      {/* En-tête */}
      <div style={{ 
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
      </div>
      
      {/* Contenu principal */}
      <div style={{ 
        padding: '30px',
        backgroundColor: '#FFFFFF',
        minHeight: 'calc(100% - 200px)'
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
              <tr style={{ 
                backgroundColor: '#EEF2FF', 
                borderTop: '2px solid #C7D2FE',
                fontWeight: 'bold'
              }}>
                <td colSpan={2} style={{ padding: '12px 15px', textAlign: 'right' }}>Total mensualité:</td>
                <td style={{ padding: '12px 15px', textAlign: 'right', color: '#2563EB' }}>
                  {equipment.length > 0 ? formatCurrency(totalMonthly) : "90,00 €"}
                </td>
              </tr>
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
        
        {/* Section signature */}
        <div style={{ marginTop: '40px' }}>
          <div style={{
            padding: '20px',
            borderTop: '2px solid #E5E7EB',
            borderColor: '#E5E7EB',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
          }}>
            <h3 style={{ 
              textAlign: 'center', 
              fontWeight: 'bold', 
              marginBottom: '16px',
              fontSize: '16px',
              color: '#1A2C3A',
            }}>
              Signature client
            </h3>
            <div style={{
              border: '1px dashed #94a3b8',
              borderRadius: '8px',
              width: '300px',
              height: '100px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
            }}>
              <p style={{ 
                color: '#9CA3AF', 
                fontSize: '12px', 
                fontStyle: 'italic' 
              }}>
                Signature précédée de "Bon pour accord"
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Pied de page */}
      <div style={{ 
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(to right, #1A2C3A, #2C4356)',
        borderTop: '3px solid #FFB74D',
        color: 'white',
        padding: '12px 15px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ 
            fontSize: '11px', 
            textAlign: 'center', 
            fontWeight: 'bold', 
            color: 'white', 
            marginBottom: '8px' 
          }}>
            Cette offre est valable 30 jours à compter de sa date d'émission.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <p style={{ 
              textAlign: 'center', 
              color: 'white', 
              opacity: 0.8, 
              fontSize: '9px' 
            }}>
              iTakecare - Avenue du Général Michel 1E, 6000 Charleroi, Belgique<br />
              TVA: BE 0795.642.894 - Tel: +32 471 511 121 - Email: hello@itakecare.be
            </p>
          </div>
          <p style={{ 
            fontSize: '9px', 
            fontWeight: 'medium', 
            color: 'white', 
            opacity: 0.8, 
            marginTop: '8px' 
          }}>
            1 / 1
          </p>
        </div>
      </div>
    </div>
  );
};

export default OfferPDFTemplate;
