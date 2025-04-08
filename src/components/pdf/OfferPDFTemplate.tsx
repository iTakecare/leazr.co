
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
  
  // Logo iTakecare en ligne de base64 ou URL publique
  const itakecareLogoUrl = "/lovable-uploads/484feeb4-7569-41e9-95d8-d790621dea74.png";
  
  return (
    <div style={{ 
      width: '210mm', 
      minHeight: '297mm',
      maxHeight: '297mm',
      margin: '0',
      padding: '0',
      backgroundColor: 'white',
      position: 'relative',
      fontFamily: 'Arial, sans-serif',
      color: '#1A2C3A',
      boxSizing: 'border-box',
      overflowY: 'hidden',
      pageBreakAfter: 'avoid',
      pageBreakInside: 'avoid'
    }}>
      {/* En-tête */}
      <div style={{ 
        background: 'linear-gradient(to right, #1A2C3A, #2C4356)', 
        color: 'white', 
        padding: '15px 20px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '3px solid #FFB74D'
      }}>
        <div style={{ height: '40px', display: 'flex', alignItems: 'center' }}>
          <img 
            src={itakecareLogoUrl} 
            alt="iTakecare Logo" 
            style={{ height: '32px', maxWidth: '150px', objectFit: 'contain' }} 
          />
        </div>
        <div style={{ 
          fontSize: '22px', 
          fontWeight: 'bold', 
          letterSpacing: '1px',
          textTransform: 'uppercase'
        }}>
          OFFRE COMMERCIALE
        </div>
      </div>
      
      {/* Corps du document */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        padding: '15px 20px',
        height: 'calc(100% - 140px)' // Hauteur restante moins en-tête et pied de page
      }} className="avoid-break">
        {/* Référence et date */}
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '15px'
        }}>
          <div style={{ 
            padding: '8px 12px',
            backgroundColor: '#1A2C3A',
            color: 'white',
            borderRadius: '6px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ margin: '0', fontSize: '14px' }}>
              {formatDate(offer.created_at)}
            </h2>
          </div>
          <div style={{ 
            padding: '8px 12px',
            backgroundColor: '#F3F4F6',
            borderRadius: '6px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
          }}>
            <h2 style={{ margin: '0', fontSize: '14px', color: '#1A2C3A' }}>
              RÉF: {offerId}
            </h2>
          </div>
        </div>
        
        {/* Information client */}
        <div style={{ 
          marginBottom: '15px', 
          padding: '10px',
          background: '#F9FAFB', 
          borderRadius: '8px',
          border: '1px solid #E5E7EB'
        }}>
          <h2 style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            marginTop: '0',
            marginBottom: '6px', 
            color: '#1A2C3A', 
            textTransform: 'uppercase',
            borderBottom: '2px solid #E5E7EB',
            paddingBottom: '4px' 
          }}>Client</h2>
          
          <div>
            <p style={{ 
              fontWeight: '600', 
              margin: '2px 0', 
              fontSize: '13px', 
              color: '#4B5563' 
            }}>
              {offer.client_company || "Client Company"}
            </p>
            <p style={{ 
              margin: '2px 0', 
              fontSize: '12px', 
              color: '#6B7280' 
            }}>
              {offer.client_name || "Client Name"}
            </p>
            <p style={{ 
              margin: '2px 0', 
              fontSize: '12px', 
              color: '#6B7280' 
            }}>
              {offer.client_email || "client@example.com"}
            </p>
          </div>
        </div>
        
        {/* Détail des équipements */}
        <div style={{ marginBottom: '15px' }}>
          <h2 style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            marginBottom: '6px', 
            color: '#1A2C3A', 
            textTransform: 'uppercase',
            borderBottom: '2px solid #E5E7EB',
            paddingBottom: '4px'
          }}>
            Détail des équipements
          </h2>
          
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            fontSize: '12px',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#1A2C3A', color: 'white' }}>
                <th style={{ padding: '5px 8px', textAlign: 'left' }}>Désignation</th>
                <th style={{ padding: '5px 8px', textAlign: 'center', width: '50px' }}>Qté</th>
                <th style={{ padding: '5px 8px', textAlign: 'right', width: '100px' }}>Mensualité</th>
              </tr>
            </thead>
            <tbody>
              {equipment.length > 0 ? (
                equipment.map((item, index) => (
                  <tr key={index} style={{ 
                    backgroundColor: index % 2 === 0 ? '#F9FAFB' : '#FFFFFF',
                    borderBottom: '1px solid #E5E7EB'
                  }}>
                    <td style={{ padding: '5px 8px' }}>{item.title}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 500 }}>
                      {formatCurrency(item.monthlyPayment * item.quantity)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr style={{ backgroundColor: '#F9FAFB' }}>
                  <td style={{ padding: '5px 8px' }}>Produit Test</td>
                  <td style={{ padding: '5px 8px', textAlign: 'center' }}>1</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 500 }}>90,00 €</td>
                </tr>
              )}
              <tr style={{ 
                backgroundColor: '#EEF2FF', 
                borderTop: '2px solid #C7D2FE',
                fontWeight: 'bold'
              }}>
                <td colSpan={2} style={{ padding: '5px 8px', textAlign: 'right' }}>Total mensualité:</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', color: '#2563EB' }}>
                  {equipment.length > 0 ? formatCurrency(totalMonthly) : "90,00 €"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Résumé financier */}
        <div style={{ 
          marginBottom: '15px',
          padding: '10px',
          backgroundColor: '#F3F4F6',
          borderRadius: '8px',
          border: '1px solid #E5E7EB'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '13px', margin: '0 0 2px 0', color: '#1A2C3A' }}>Récapitulatif</h3>
              <p style={{ fontSize: '11px', margin: '0', color: '#6B7280' }}>Engagement sur 36 mois</p>
            </div>
            <div style={{ 
              fontSize: '14px', 
              fontWeight: 'bold', 
              color: '#2563EB', 
              backgroundColor: 'white',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #E5E7EB'
            }}>
              {equipment.length > 0 
                ? `${formatCurrency(totalMonthly)} HTVA /mois` 
                : "90,00 € HTVA /mois"}
            </div>
          </div>
        </div>
        
        {/* Avantages du leasing - version plus compacte */}
        <div style={{ 
          marginBottom: '15px',
          padding: '10px',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          backgroundColor: '#FAFAFA'
        }}>
          <h3 style={{ 
            fontSize: '13px', 
            fontWeight: 'bold', 
            marginTop: '0',
            marginBottom: '6px', 
            color: '#1A2C3A', 
            textTransform: 'uppercase'
          }}>
            Les avantages de notre solution de leasing
          </h3>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ flex: '1 1 45%', minWidth: '200px' }}>
              <p style={{ margin: '0 0 3px 0', fontWeight: '600', fontSize: '11px', color: '#4B5563' }}>
                ✓ Optimisation fiscale
              </p>
              <p style={{ margin: '0 0 3px 0', fontWeight: '600', fontSize: '11px', color: '#4B5563' }}>
                ✓ Préservation de trésorerie
              </p>
            </div>
            <div style={{ flex: '1 1 45%', minWidth: '200px' }}>
              <p style={{ margin: '0 0 3px 0', fontWeight: '600', fontSize: '11px', color: '#4B5563' }}>
                ✓ Matériel toujours à jour
              </p>
              <p style={{ margin: '0 0 3px 0', fontWeight: '600', fontSize: '11px', color: '#4B5563' }}>
                ✓ Service et support inclus
              </p>
            </div>
          </div>
        </div>
        
        {/* Section signature - placée en bas */}
        <div style={{ marginTop: 'auto' }}>
          <div style={{
            padding: '8px',
            borderTop: '2px solid #E5E7EB',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
          }}>
            <h3 style={{ 
              textAlign: 'center', 
              fontWeight: 'bold', 
              fontSize: '13px',
              color: '#1A2C3A',
              margin: '0 0 6px 0'
            }}>
              Signature client
            </h3>
            <div style={{
              border: '1px dashed #94a3b8',
              borderRadius: '8px',
              width: '200px',
              height: '65px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
            }}>
              <p style={{ 
                color: '#9CA3AF', 
                fontSize: '10px', 
                fontStyle: 'italic',
                margin: 0
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
        padding: '6px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ 
            fontSize: '10px', 
            textAlign: 'center', 
            fontWeight: 'bold', 
            color: 'white', 
            margin: '0 0 2px 0'
          }}>
            Cette offre est valable 30 jours à compter de sa date d'émission.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <p style={{ 
              textAlign: 'center', 
              color: 'white', 
              opacity: 0.8, 
              fontSize: '8px',
              margin: '1px 0' 
            }}>
              iTakecare - Avenue du Général Michel 1E, 6000 Charleroi, Belgique<br />
              TVA: BE 0795.642.894 - Tel: +32 471 511 121 - Email: hello@itakecare.be
            </p>
          </div>
          <p style={{ 
            fontSize: '8px', 
            fontWeight: 'medium', 
            color: 'white', 
            opacity: 0.8, 
            margin: '1px 0' 
          }}>
            1 / 1
          </p>
        </div>
      </div>
    </div>
  );
};

export default OfferPDFTemplate;
