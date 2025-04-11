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
    signature_data?: string;
    signer_name?: string;
    signed_at?: string;
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

const formatDate = (dateString: string | Date | null | undefined): string => {
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

const formatLegalTimestamp = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    };
    
    return new Intl.DateTimeFormat('fr-FR', options).format(date);
  } catch (e) {
    return "";
  }
};

const OfferPDFTemplate: React.FC<OfferPDFTemplateProps> = ({ offer }) => {
  const equipment = parseEquipmentData(offer.equipment_description);
  const offerId = offer.offer_id || `OFF-${offer.id?.substring(0, 8).toUpperCase()}`;
  const isOfferSigned = !!offer.signature_data;
  
  return (
    <div style={{ 
      width: "190mm", 
      minHeight: "277mm", 
      maxHeight: "277mm",
      padding: "0", 
      margin: "0 auto",
      fontFamily: "Arial, sans-serif",
      fontSize: "9pt",
      color: "#333",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      position: "relative",
      backgroundColor: "white"
    }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        padding: "5mm 10mm",
        borderBottom: "0.5mm solid #1A2C3A",
        backgroundColor: "#1A2C3A",
        color: "white"
      }}>
        <img 
          src="/lovable-uploads/645b6558-da78-4099-a8d4-c78f40873b60.png" 
          alt="iTakecare Logo" 
          style={{ height: "10mm" }} 
        />
        <span style={{ 
          fontSize: "12pt", 
          fontWeight: "bold"
        }}>
          OFFRE COMMERCIALE
        </span>
      </div>

      <div style={{ 
        padding: "5mm 10mm",
        flex: "1",
        display: "flex",
        flexDirection: "column"
      }}>
        <div style={{ 
          textAlign: "center", 
          margin: "2mm 0 5mm 0"
        }}>
          <h1 style={{ 
            fontSize: "11pt", 
            fontWeight: "bold", 
            margin: "0",
            color: "#1A2C3A"
          }}>
            RÉFÉRENCE: {offerId}
          </h1>
        </div>

        <div style={{ 
          display: "flex", 
          justifyContent: "space-between",
          margin: "0 0 5mm 0",
          padding: "3mm",
          border: "0.2mm solid #e5e7eb",
          borderRadius: "1mm"
        }}>
          <div>
            <h2 style={{ fontSize: "9pt", fontWeight: "bold", margin: "0 0 1mm 0" }}>
              Informations client
            </h2>
            <p style={{ margin: "0.5mm 0", fontSize: "9pt" }}>
              {offer.client_company || "Client Company"}
            </p>
            <p style={{ margin: "0.5mm 0", fontSize: "9pt" }}>
              {offer.client_name || "Client Name"}
            </p>
            <p style={{ margin: "0.5mm 0", fontSize: "9pt" }}>
              {offer.client_email || "client@example.com"}
            </p>
          </div>
          <div>
            <p style={{ margin: "0.5mm 0", fontSize: "9pt", textAlign: "right" }}>
              Date: {formatDate(offer.created_at) || "01/01/2025"}
            </p>
            <p style={{ margin: "0.5mm 0", fontSize: "9pt", textAlign: "right" }}>
              Validité: 30 jours
            </p>
          </div>
        </div>

        <div style={{ margin: "0 0 5mm 0" }}>
          <h2 style={{ 
            fontSize: "9pt", 
            fontWeight: "bold", 
            margin: "0 0 2mm 0", 
            color: "#1A2C3A" 
          }}>
            Détail des équipements
          </h2>
          
          <table style={{ 
            width: "100%", 
            borderCollapse: "collapse", 
            fontSize: "8pt",
            tableLayout: "fixed"
          }}>
            <thead>
              <tr style={{ backgroundColor: "#f3f4f6" }}>
                <th style={{ 
                  padding: "2mm", 
                  textAlign: "left", 
                  border: "0.2mm solid #e5e7eb", 
                  width: "60%" 
                }}>
                  Désignation
                </th>
                <th style={{ 
                  padding: "2mm", 
                  textAlign: "center", 
                  border: "0.2mm solid #e5e7eb", 
                  width: "10%" 
                }}>
                  Qté
                </th>
                <th style={{ 
                  padding: "2mm", 
                  textAlign: "right", 
                  border: "0.2mm solid #e5e7eb", 
                  width: "30%" 
                }}>
                  Mensualité
                </th>
              </tr>
            </thead>
            <tbody>
              {equipment.length > 0 ? (
                equipment.map((item, index) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? "#fff" : "#f9fafb" }}>
                    <td style={{ 
                      padding: "2mm", 
                      border: "0.2mm solid #e5e7eb",
                      whiteSpace: "normal",
                      wordBreak: "break-word"
                    }}>
                      {item.title}
                    </td>
                    <td style={{ 
                      padding: "2mm", 
                      textAlign: "center", 
                      border: "0.2mm solid #e5e7eb" 
                    }}>
                      {item.quantity}
                    </td>
                    <td style={{ 
                      padding: "2mm", 
                      textAlign: "right", 
                      border: "0.2mm solid #e5e7eb" 
                    }}>
                      {formatCurrency(item.monthlyPayment)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={{ padding: "2mm", border: "0.2mm solid #e5e7eb" }}>
                    Produit Test
                  </td>
                  <td style={{ 
                    padding: "2mm", 
                    textAlign: "center", 
                    border: "0.2mm solid #e5e7eb" 
                  }}>
                    1
                  </td>
                  <td style={{ 
                    padding: "2mm", 
                    textAlign: "right", 
                    border: "0.2mm solid #e5e7eb" 
                  }}>
                    90,00 €
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ 
          margin: "0 0 5mm 0",
          padding: "3mm",
          backgroundColor: "#f9fafb",
          borderRadius: "1mm",
          border: "0.2mm solid #e5e7eb"
        }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center" 
          }}>
            <div>
              <h3 style={{ fontSize: "9pt", fontWeight: "bold", margin: "0 0 1mm 0" }}>
                Récapitulatif
              </h3>
              <p style={{ fontSize: "8pt", margin: "0" }}>
                Engagement sur 36 mois
              </p>
            </div>
            <div style={{ 
              fontSize: "12pt", 
              fontWeight: "bold", 
              color: "#2563EB" 
            }}>
              {formatCurrency(offer.monthly_payment)} HTVA /mois
            </div>
          </div>
        </div>

        <div style={{ 
          display: "flex",
          margin: "0 0 5mm 0",
          padding: "3mm",
          border: "0.2mm solid #e5e7eb",
          borderRadius: "1mm"
        }}>
          <div style={{ width: "30%" }}>
            <h3 style={{ 
              fontSize: "9pt", 
              fontWeight: "bold", 
              margin: "0 0 2mm 0",
              color: "#1A2C3A"
            }}>
              Les avantages de notre solution
            </h3>
          </div>
          <div style={{ 
            width: "70%",
            display: "flex",
            flexWrap: "wrap"
          }}>
            <div style={{ width: "50%" }}>
              <p style={{ margin: "0 0 1mm 0", fontSize: "8pt" }}>
                ✓ Optimisation fiscale
              </p>
              <p style={{ margin: "0 0 1mm 0", fontSize: "8pt" }}>
                ✓ Préservation de trésorerie
              </p>
            </div>
            <div style={{ width: "50%" }}>
              <p style={{ margin: "0 0 1mm 0", fontSize: "8pt" }}>
                ✓ Matériel toujours à jour
              </p>
              <p style={{ margin: "0 0 1mm 0", fontSize: "8pt" }}>
                ✓ Service et support inclus
              </p>
            </div>
          </div>
        </div>

        <div style={{ 
          margin: "5mm 0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}>
          <h3 style={{ 
            fontSize: "9pt", 
            fontWeight: "bold", 
            margin: "0 0 2mm 0",
            textAlign: "center"
          }}>
            Signature client
          </h3>
          {isOfferSigned ? (
            <div style={{ 
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
              marginTop: "2mm"
            }}>
              <div style={{ 
                textAlign: "center", 
                fontSize: "8pt", 
                fontStyle: "italic",
                marginBottom: "2mm",
                color: "#4B5563"
              }}>
                Bon pour accord pour {formatCurrency(offer.monthly_payment)} pendant 36 mois
              </div>
              <img 
                src={offer.signature_data} 
                alt="Signature du client" 
                style={{ 
                  maxWidth: "70mm",
                  maxHeight: "30mm",
                  border: "0.2mm solid #E5E7EB",
                  padding: "2mm",
                  backgroundColor: "white"
                }} 
              />
              <div style={{ 
                textAlign: "center", 
                fontSize: "8pt", 
                marginTop: "2mm",
                color: "#4B5563" 
              }}>
                Signé électroniquement par {offer.signer_name || "le client"} 
                {offer.signed_at ? ` le ${formatLegalTimestamp(offer.signed_at)}` : ""}
              </div>
            </div>
          ) : (
            <div style={{ 
              width: "40mm", 
              height: "20mm", 
              border: "0.2mm dashed #ccc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <p style={{ 
                color: "#9ca3af", 
                fontSize: "7pt", 
                fontStyle: "italic",
                textAlign: "center"
              }}>
                Signature précédée de<br/>"Bon pour accord pour {formatCurrency(offer.monthly_payment)} pendant 36 mois"
              </p>
            </div>
          )}
        </div>
        
        <div style={{ flex: "1" }}></div>
      </div>

      <div style={{ 
        borderTop: "0.2mm solid #e5e7eb",
        padding: "2mm",
        textAlign: "center",
        fontSize: "7pt",
        color: "#6b7280",
        marginTop: "auto",
        backgroundColor: "#f9fafb"
      }}>
        <p style={{ margin: "0 0 1mm 0" }}>
          Cette offre est valable 30 jours à compter de sa date d'émission.
        </p>
        <p style={{ margin: "0" }}>
          iTakecare - Avenue du Général Michel 1E, 6000 Charleroi, Belgique - TVA: BE 0795.642.894
        </p>
      </div>
    </div>
  );
};

export default OfferPDFTemplate;
