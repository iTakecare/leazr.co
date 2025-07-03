import React from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice } from "@/services/invoiceService";

interface InvoicePDFTemplateProps {
  invoice: Invoice;
  companyInfo?: {
    name: string;
    address?: string;
    email?: string;
    phone?: string;
    vat?: string;
  };
}

const InvoicePDFTemplate: React.FC<InvoicePDFTemplateProps> = ({ 
  invoice, 
  companyInfo = {
    name: "iTakecare",
    address: "Avenue du Général Michel 1E, 6000 Charleroi, Belgique",
    email: "info@itakecare.be",
    phone: "+32 71 123 456",
    vat: "BE 0795.642.894"
  }
}) => {
  const invoiceNumber = invoice.invoice_number || `FAC-${invoice.id.slice(0, 8).toUpperCase()}`;
  
  // Parse les données de facturation
  const billingData = invoice.billing_data || {};
  const items = billingData.invoice?.items || [];

  const getStatusLabel = (status: string) => {
    const statusLabels = {
      draft: "BROUILLON",
      sent: "ENVOYÉE",
      paid: "PAYÉE",
      cancelled: "ANNULÉE"
    };
    return statusLabels[status as keyof typeof statusLabels] || status.toUpperCase();
  };

  const getStatusColor = (status: string) => {
    const statusColors = {
      draft: "#6B7280",
      sent: "#F59E0B",
      paid: "#10B981",
      cancelled: "#EF4444"
    };
    return statusColors[status as keyof typeof statusColors] || "#6B7280";
  };

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
      {/* Header */}
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
        <div style={{ textAlign: "right" }}>
          <span style={{ 
            fontSize: "12pt", 
            fontWeight: "bold",
            display: "block"
          }}>
            FACTURE
          </span>
          <span style={{ 
            fontSize: "8pt",
            color: getStatusColor(invoice.status),
            backgroundColor: "rgba(255,255,255,0.9)",
            padding: "1mm 2mm",
            borderRadius: "1mm",
            marginTop: "1mm",
            display: "inline-block"
          }}>
            {getStatusLabel(invoice.status)}
          </span>
        </div>
      </div>

      <div style={{ 
        padding: "5mm 10mm",
        flex: "1",
        display: "flex",
        flexDirection: "column"
      }}>
        {/* Numéro de facture et dates */}
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
            FACTURE N° {invoiceNumber}
          </h1>
        </div>

        {/* Informations entreprise et dates */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between",
          margin: "0 0 5mm 0",
          padding: "3mm",
          border: "0.2mm solid #e5e7eb",
          borderRadius: "1mm"
        }}>
          <div>
            <h2 style={{ fontSize: "9pt", fontWeight: "bold", margin: "0 0 2mm 0" }}>
              Facturé par
            </h2>
            <p style={{ margin: "0.5mm 0", fontSize: "9pt", fontWeight: "bold" }}>
              {companyInfo.name}
            </p>
            {companyInfo.address && (
              <p style={{ margin: "0.5mm 0", fontSize: "8pt" }}>
                {companyInfo.address}
              </p>
            )}
            {companyInfo.email && (
              <p style={{ margin: "0.5mm 0", fontSize: "8pt" }}>
                Email: {companyInfo.email}
              </p>
            )}
            {companyInfo.phone && (
              <p style={{ margin: "0.5mm 0", fontSize: "8pt" }}>
                Tél: {companyInfo.phone}
              </p>
            )}
            {companyInfo.vat && (
              <p style={{ margin: "0.5mm 0", fontSize: "8pt" }}>
                TVA: {companyInfo.vat}
              </p>
            )}
          </div>
          
          <div style={{ textAlign: "right" }}>
            <h2 style={{ fontSize: "9pt", fontWeight: "bold", margin: "0 0 2mm 0" }}>
              Facturé à
            </h2>
            <p style={{ margin: "0.5mm 0", fontSize: "9pt", fontWeight: "bold" }}>
              {invoice.leaser_name}
            </p>
            
            <div style={{ marginTop: "5mm" }}>
              <p style={{ margin: "0.5mm 0", fontSize: "8pt" }}>
                <strong>Date:</strong> {formatDate(invoice.created_at)}
              </p>
              {invoice.due_date && (
                <p style={{ margin: "0.5mm 0", fontSize: "8pt" }}>
                  <strong>Échéance:</strong> {formatDate(invoice.due_date)}
                </p>
              )}
              {invoice.sent_at && (
                <p style={{ margin: "0.5mm 0", fontSize: "8pt" }}>
                  <strong>Envoyée le:</strong> {formatDate(invoice.sent_at)}
                </p>
              )}
              {invoice.paid_at && (
                <p style={{ margin: "0.5mm 0", fontSize: "8pt", color: "#10B981" }}>
                  <strong>Payée le:</strong> {formatDate(invoice.paid_at)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Détail des éléments facturés */}
        <div style={{ margin: "0 0 5mm 0" }}>
          <h2 style={{ 
            fontSize: "9pt", 
            fontWeight: "bold", 
            margin: "0 0 2mm 0", 
            color: "#1A2C3A" 
          }}>
            Détail de la facturation
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
                  width: "50%" 
                }}>
                  Description
                </th>
                <th style={{ 
                  padding: "2mm", 
                  textAlign: "center", 
                  border: "0.2mm solid #e5e7eb", 
                  width: "15%" 
                }}>
                  Quantité
                </th>
                <th style={{ 
                  padding: "2mm", 
                  textAlign: "right", 
                  border: "0.2mm solid #e5e7eb", 
                  width: "20%" 
                }}>
                  Prix unitaire
                </th>
                <th style={{ 
                  padding: "2mm", 
                  textAlign: "right", 
                  border: "0.2mm solid #e5e7eb", 
                  width: "15%" 
                }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item: any, index: number) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? "#fff" : "#f9fafb" }}>
                    <td style={{ 
                      padding: "2mm", 
                      border: "0.2mm solid #e5e7eb",
                      whiteSpace: "normal",
                      wordBreak: "break-word"
                    }}>
                      {item.description || "Service de leasing"}
                    </td>
                    <td style={{ 
                      padding: "2mm", 
                      textAlign: "center", 
                      border: "0.2mm solid #e5e7eb" 
                    }}>
                      {item.quantity || 1}
                    </td>
                    <td style={{ 
                      padding: "2mm", 
                      textAlign: "right", 
                      border: "0.2mm solid #e5e7eb" 
                    }}>
                      {formatCurrency(item.unit_price || 0)}
                    </td>
                    <td style={{ 
                      padding: "2mm", 
                      textAlign: "right", 
                      border: "0.2mm solid #e5e7eb" 
                    }}>
                      {formatCurrency(item.total || 0)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={{ padding: "2mm", border: "0.2mm solid #e5e7eb" }}>
                    Service de leasing - Contrat {invoice.contract_id}
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
                    {formatCurrency(invoice.amount)}
                  </td>
                  <td style={{ 
                    padding: "2mm", 
                    textAlign: "right", 
                    border: "0.2mm solid #e5e7eb" 
                  }}>
                    {formatCurrency(invoice.amount)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Total */}
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
                Total de la facture
              </h3>
              {invoice.integration_type && (
                <p style={{ fontSize: "8pt", margin: "0" }}>
                  Via {invoice.integration_type}
                </p>
              )}
            </div>
            <div style={{ 
              fontSize: "14pt", 
              fontWeight: "bold", 
              color: "#2563EB" 
            }}>
              {formatCurrency(invoice.amount)}
            </div>
          </div>
        </div>

        {/* Informations de paiement */}
        {invoice.status === 'paid' && invoice.paid_at && (
          <div style={{ 
            margin: "0 0 5mm 0",
            padding: "3mm",
            backgroundColor: "#dcfce7",
            borderRadius: "1mm",
            border: "0.2mm solid #16a34a"
          }}>
            <h3 style={{ 
              fontSize: "9pt", 
              fontWeight: "bold", 
              margin: "0 0 1mm 0",
              color: "#16a34a"
            }}>
              ✓ Facture payée
            </h3>
            <p style={{ fontSize: "8pt", margin: "0", color: "#15803d" }}>
              Paiement reçu le {formatDate(invoice.paid_at)}
            </p>
          </div>
        )}

        {/* Notes */}
        {billingData.notes && (
          <div style={{ margin: "0 0 5mm 0" }}>
            <h3 style={{ 
              fontSize: "9pt", 
              fontWeight: "bold", 
              margin: "0 0 2mm 0",
              color: "#1A2C3A"
            }}>
              Notes
            </h3>
            <p style={{ fontSize: "8pt", margin: "0" }}>
              {billingData.notes}
            </p>
          </div>
        )}
        
        <div style={{ flex: "1" }}></div>
      </div>

      {/* Footer */}
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
          Merci pour votre confiance. En cas de question, contactez-nous à {companyInfo.email}
        </p>
        <p style={{ margin: "0" }}>
          {companyInfo.name} - {companyInfo.address} - TVA: {companyInfo.vat}
        </p>
      </div>
    </div>
  );
};

export default InvoicePDFTemplate;