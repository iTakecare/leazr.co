
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
      width: '195mm', 
      minHeight: '270mm', 
      margin: '0 auto', 
      fontFamily: 'Arial, sans-serif',
      position: 'relative',
      boxSizing: 'border-box',
      padding: '0',
      overflow: 'hidden'
    }}>
      {/* En-tête avec dégradé bleu */}
      <div style={{ 
        background: 'linear-gradient(to right, #1A2C3A, #2C4356)', 
        color: 'white', 
        padding: '15px 20px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '3px solid #FFB74D',
        width: '100%'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/lovable-uploads/7e711eae-90de-40ce-806c-21ffa5c9d7b6.png" alt="iTakecare Logo" style={{ height: '30px' }} />
        </div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '1px' }}>
          OFFRE COMMERCIALE
        </div>
      </div>
      
      {/* Contenu principal avec plus d'espace */}
      <div style={{ padding: '20px', backgroundColor: '#FFFFFF' }}>
        {/* Référence de l'offre dans une boîte distincte */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '20px',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          padding: '10px',
          background: '#F9FAFB'
        }}>
          <h1 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0', color: '#1A2C3A' }}>
            RÉFÉRENCE: {offerId}
          </h1>
        </div>
      
        {/* Information client et référence - Design modernisé */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '25px', 
          padding: '15px',
          background: '#F3F4F6', 
          borderRadius: '8px'
        }}>
          <div>
            <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#1A2C3A', textTransform: 'uppercase' }}>Informations client</h2>
            <p style={{ fontWeight: '600', margin: '5px 0', fontSize: '13px', color: '#4B5563' }}>{offer.client_company || "Client Company"}</p>
            <p style={{ margin: '5px 0', fontSize: '12px', color: '#6B7280' }}>{offer.client_name || "Client Name"}</p>
            <p style={{ margin: '5px 0', fontSize: '12px', color: '#6B7280' }}>{offer.client_email || "client@example.com"}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: '5px 0', fontSize: '12px', color: '#6B7280' }}>Date: <span style={{ fontWeight: '500' }}>{formatDate(offer.created_at) || "21/03/2025"}</span></p>
            <p style={{ margin: '5px 0', fontSize: '12px', color: '#6B7280' }}>Validité: <span style={{ fontWeight: '500' }}>30 jours</span></p>
          </div>
        </div>
        
        {/* Liste d'équipements avec design amélioré */}
        <div style={{ marginBottom: '25px' }}>
          <h2 style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            marginBottom: '10px', 
            color: '#1A2C3A', 
            textTransform: 'uppercase',
            borderBottom: '2px solid #E5E7EB',
            paddingBottom: '8px'
          }}>Détail des équipements</h2>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ backgroundColor: '#1A2C3A', color: 'white' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', borderRadius: '4px 0 0 0', width: '65%' }}>Désignation</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', width: '15%' }}>Qté</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', width: '20%', borderRadius: '0 4px 0 0' }}>Mensualité</th>
              </tr>
            </thead>
            <tbody>
              {equipment.length > 0 ? (
                equipment.map((item, index) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#F9FAFB' : '#FFFFFF' }}>
                    <td style={{ 
                      padding: '8px 10px', 
                      borderBottom: '1px solid #E5E7EB',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {item.title}
                    </td>
                    <td style={{ 
                      padding: '8px 10px', 
                      textAlign: 'center', 
                      borderBottom: '1px solid #E5E7EB'
                    }}>
                      {item.quantity}
                    </td>
                    <td style={{ 
                      padding: '8px 10px', 
                      textAlign: 'right', 
                      borderBottom: '1px solid #E5E7EB',
                      fontWeight: 500
                    }}>
                      {formatCurrency(item.monthlyPayment)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr style={{ backgroundColor: '#F9FAFB' }}>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #E5E7EB' }}>Produit Test</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '1px solid #E5E7EB' }}>1</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '1px solid #E5E7EB', fontWeight: 500 }}>90,00 €</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Résumé financier dans une boîte distincte */}
        <div style={{ 
          marginBottom: '30px',
          padding: '15px',
          backgroundColor: '#F3F4F6',
          borderRadius: '8px',
          border: '1px solid #E5E7EB'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '14px', margin: '0 0 5px 0', color: '#1A2C3A' }}>Récapitulatif</h3>
              <p style={{ fontSize: '12px', margin: '0', color: '#6B7280' }}>Engagement sur 36 mois</p>
            </div>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: 'bold', 
              color: '#2563EB', 
              backgroundColor: 'white',
              padding: '8px 15px',
              borderRadius: '6px',
              border: '1px solid #E5E7EB'
            }}>
              {equipment.length > 0 
                ? `${formatCurrency(totalMonthly)} HTVA /mois` 
                : `${formatCurrency(offer.monthly_payment)} HTVA /mois`}
            </div>
          </div>
        </div>
        
        {/* Avantages du leasing - Nouvelle section */}
        <div style={{ 
          marginBottom: '25px',
          padding: '15px',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          backgroundColor: '#FAFAFA'
        }}>
          <h3 style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            marginBottom: '10px', 
            color: '#1A2C3A', 
            textTransform: 'uppercase'
          }}>
            Les avantages de notre solution de leasing
          </h3>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div style={{ width: '48%' }}>
              <p style={{ margin: '0 0 5px 0', fontWeight: '600', fontSize: '12px', color: '#4B5563' }}>✓ Optimisation fiscale</p>
              <p style={{ margin: '0 0 5px 0', fontWeight: '600', fontSize: '12px', color: '#4B5563' }}>✓ Préservation de trésorerie</p>
            </div>
            <div style={{ width: '48%' }}>
              <p style={{ margin: '0 0 5px 0', fontWeight: '600', fontSize: '12px', color: '#4B5563' }}>✓ Matériel toujours à jour</p>
              <p style={{ margin: '0 0 5px 0', fontWeight: '600', fontSize: '12px', color: '#4B5563' }}>✓ Service et support inclus</p>
            </div>
          </div>
        </div>
        
        {/* Section signature avec design amélioré */}
        <div style={{ 
          marginTop: '30px', 
          borderTop: '2px solid #E5E7EB', 
          paddingTop: '15px'
        }}>
          <h3 style={{ 
            textAlign: 'center', 
            fontWeight: 'bold', 
            marginBottom: '10px', 
            fontSize: '14px', 
            color: '#1A2C3A'
          }}>
            Signature client
          </h3>
          <div style={{ 
            width: '250px', 
            height: '80px', 
            border: '1px dashed #94a3b8', 
            borderRadius: '8px', 
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <p style={{ color: '#9CA3AF', fontSize: '11px', fontStyle: 'italic' }}>Signature précédée de "Bon pour accord"</p>
          </div>
        </div>
      </div>
      
      {/* Pied de page amélioré */}
      <div style={{ 
        position: 'absolute', 
        bottom: '0', 
        left: '0', 
        right: '0', 
        width: '100%', 
        borderTop: '3px solid #FFB74D', 
        background: 'linear-gradient(to right, #1A2C3A, #2C4356)',
        color: 'white',
        padding: '12px 15px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: '500', marginBottom: '8px', fontSize: '11px' }}>
            Cette offre est valable 30 jours à compter de sa date d'émission.
          </p>
          <div style={{ fontSize: '10px', opacity: 0.9 }}>
            <p style={{ margin: '2px 0' }}>
              iTakecare - Avenue du Général Michel 1E, 6000 Charleroi, Belgique
            </p>
            <p style={{ margin: '2px 0' }}>
              TVA: BE 0795.642.894 - Tel: +32 471 511 121 - Email: hello@itakecare.be
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfferPDFTemplate;
