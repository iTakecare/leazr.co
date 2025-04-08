
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
    <div className="bg-white" style={{ width: '100%', minHeight: '100vh', maxWidth: '210mm', margin: '0 auto', position: 'relative', fontFamily: 'Arial, sans-serif' }}>
      {/* En-tête avec dégradé bleu */}
      <header style={{ 
        background: 'linear-gradient(to right, #1A2C3A, #2C4356)', 
        color: 'white', 
        padding: '20px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '3px solid #FFB74D'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/lovable-uploads/7e711eae-90de-40ce-806c-21ffa5c9d7b6.png" alt="iTakecare Logo" style={{ height: '40px' }} />
        </div>
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '1px' }}>
          OFFRE COMMERCIALE
        </div>
      </header>
      
      {/* Contenu principal avec plus d'espace */}
      <main style={{ padding: '30px', backgroundColor: '#FFFFFF' }}>
        {/* Référence de l'offre dans une boîte distincte */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '25px',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          padding: '12px',
          background: '#F9FAFB'
        }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0', color: '#1A2C3A' }}>
            RÉFÉRENCE: {offerId}
          </h1>
        </div>
      
        {/* Information client et référence - Design modernisé */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '30px', 
          padding: '15px',
          background: '#F3F4F6', 
          borderRadius: '8px'
        }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '10px', color: '#1A2C3A', textTransform: 'uppercase' }}>Informations client</h2>
            <p style={{ fontWeight: '600', margin: '5px 0', fontSize: '0.95rem', color: '#4B5563' }}>{offer.client_company || "Client Company"}</p>
            <p style={{ margin: '5px 0', fontSize: '0.9rem', color: '#6B7280' }}>{offer.client_name || "Client Name"}</p>
            <p style={{ margin: '5px 0', fontSize: '0.9rem', color: '#6B7280' }}>{offer.client_email || "client@example.com"}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: '5px 0', fontSize: '0.9rem', color: '#6B7280' }}>Date: <span style={{ fontWeight: '500' }}>{formatDate(offer.created_at) || "21/03/2025"}</span></p>
            <p style={{ margin: '5px 0', fontSize: '0.9rem', color: '#6B7280' }}>Validité: <span style={{ fontWeight: '500' }}>30 jours</span></p>
          </div>
        </div>
        
        {/* Liste d'équipements avec design amélioré */}
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ 
            fontSize: '1.1rem', 
            fontWeight: 'bold', 
            marginBottom: '15px', 
            color: '#1A2C3A', 
            textTransform: 'uppercase',
            borderBottom: '2px solid #E5E7EB',
            paddingBottom: '8px'
          }}>Détail des équipements</h2>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#1A2C3A', color: 'white' }}>
                <th style={{ padding: '10px 15px', textAlign: 'left', borderRadius: '8px 0 0 0' }}>Désignation</th>
                <th style={{ padding: '10px 15px', textAlign: 'center', width: '70px' }}>Qté</th>
                <th style={{ padding: '10px 15px', textAlign: 'right', width: '120px', borderRadius: '0 8px 0 0' }}>Mensualité</th>
              </tr>
            </thead>
            <tbody>
              {equipment.length > 0 ? (
                equipment.map((item, index) => {
                  const isLast = index === equipment.length - 1;
                  return (
                    <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#F9FAFB' : '#FFFFFF' }}>
                      <td style={{ 
                        padding: '10px 15px', 
                        borderBottom: '1px solid #E5E7EB'
                      }}>{item.title}</td>
                      <td style={{ 
                        padding: '10px 15px', 
                        textAlign: 'center', 
                        borderBottom: '1px solid #E5E7EB'
                      }}>{item.quantity}</td>
                      <td style={{ 
                        padding: '10px 15px', 
                        textAlign: 'right', 
                        borderBottom: '1px solid #E5E7EB',
                        fontWeight: 500
                      }}>{formatCurrency(item.monthlyPayment)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr style={{ backgroundColor: '#F9FAFB' }}>
                  <td style={{ padding: '10px 15px', borderBottom: '1px solid #E5E7EB' }}>Produit Test</td>
                  <td style={{ padding: '10px 15px', textAlign: 'center', borderBottom: '1px solid #E5E7EB' }}>1</td>
                  <td style={{ padding: '10px 15px', textAlign: 'right', borderBottom: '1px solid #E5E7EB', fontWeight: 500 }}>90,00 €</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Résumé financier dans une boîte distincte */}
        <div style={{ 
          marginBottom: '40px',
          padding: '20px',
          backgroundColor: '#F3F4F6',
          borderRadius: '8px',
          border: '1px solid #E5E7EB'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1rem', margin: '0 0 5px 0', color: '#1A2C3A' }}>Récapitulatif</h3>
              <p style={{ fontSize: '0.85rem', margin: '0', color: '#6B7280' }}>Engagement sur 36 mois</p>
            </div>
            <div style={{ 
              fontSize: '1.2rem', 
              fontWeight: 'bold', 
              color: '#2563EB', 
              backgroundColor: 'white',
              padding: '10px 20px',
              borderRadius: '6px',
              border: '1px solid #E5E7EB'
            }}>
              {equipment.length > 0 
                ? `${formatCurrency(totalMonthly)} HTVA /mois` 
                : "90,00 € HTVA /mois"}
            </div>
          </div>
        </div>
        
        {/* Avantages du leasing - Nouvelle section */}
        <div style={{ 
          marginBottom: '30px',
          padding: '15px',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          backgroundColor: '#FAFAFA'
        }}>
          <h3 style={{ 
            fontSize: '1rem', 
            fontWeight: 'bold', 
            marginBottom: '10px', 
            color: '#1A2C3A', 
            textTransform: 'uppercase'
          }}>
            Les avantages de notre solution de leasing
          </h3>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
            <div style={{ flex: '1 1 45%', minWidth: '200px' }}>
              <p style={{ margin: '0 0 5px 0', fontWeight: '600', fontSize: '0.9rem', color: '#4B5563' }}>✓ Optimisation fiscale</p>
              <p style={{ margin: '0 0 5px 0', fontWeight: '600', fontSize: '0.9rem', color: '#4B5563' }}>✓ Préservation de trésorerie</p>
            </div>
            <div style={{ flex: '1 1 45%', minWidth: '200px' }}>
              <p style={{ margin: '0 0 5px 0', fontWeight: '600', fontSize: '0.9rem', color: '#4B5563' }}>✓ Matériel toujours à jour</p>
              <p style={{ margin: '0 0 5px 0', fontWeight: '600', fontSize: '0.9rem', color: '#4B5563' }}>✓ Service et support inclus</p>
            </div>
          </div>
        </div>
        
        {/* Section signature avec design amélioré */}
        <div style={{ 
          marginTop: '40px', 
          borderTop: '2px solid #E5E7EB', 
          paddingTop: '20px'
        }}>
          <h3 style={{ 
            textAlign: 'center', 
            fontWeight: 'bold', 
            marginBottom: '15px', 
            fontSize: '1rem', 
            color: '#1A2C3A'
          }}>
            Signature client
          </h3>
          <div style={{ 
            width: '300px', 
            height: '100px', 
            border: '1px dashed #94a3b8', 
            borderRadius: '8px', 
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <p style={{ color: '#9CA3AF', fontSize: '0.8rem', fontStyle: 'italic' }}>Signature précédée de "Bon pour accord"</p>
          </div>
        </div>
      </main>
      
      {/* Pied de page amélioré */}
      <footer style={{ 
        position: 'absolute', 
        bottom: '0', 
        left: '0', 
        right: '0', 
        width: '100%', 
        borderTop: '3px solid #FFB74D', 
        background: 'linear-gradient(to right, #1A2C3A, #2C4356)',
        color: 'white',
        padding: '15px 20px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: '500', marginBottom: '10px', fontSize: '0.9rem' }}>
            Cette offre est valable 30 jours à compter de sa date d'émission.
          </p>
          <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
            <p style={{ margin: '2px 0' }}>
              iTakecare - Avenue du Général Michel 1E, 6000 Charleroi, Belgique
            </p>
            <p style={{ margin: '2px 0' }}>
              TVA: BE 0795.642.894 - Tel: +32 471 511 121 - Email: hello@itakecare.be
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default OfferPDFTemplate;
