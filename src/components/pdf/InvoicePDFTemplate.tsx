import React from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice } from "@/services/invoiceService";
import type { CompanyInvoiceData } from "@/services/invoiceCompanyService";

interface InvoicePDFTemplateProps {
  invoice: Invoice;
  companyInfo?: CompanyInvoiceData;
}

const InvoicePDFTemplate: React.FC<InvoicePDFTemplateProps> = ({ 
  invoice, 
  companyInfo = {
    name: "Entreprise",
    address: "Adresse non renseignée",
    email: "contact@entreprise.com",
    phone: "Téléphone non renseigné",
    vat: "TVA non renseignée"
  }
}) => {
  const invoiceNumber = invoice.invoice_number || `FAC-${invoice.id.slice(0, 8).toUpperCase()}`;
  
  // Parse les données de facturation
  const billingData = invoice.billing_data || {};
  const items = billingData.invoice?.items || [];
  const vatSummary = billingData.vatSummary || [];
  const totals = billingData.totals || {
    totalExclVat: invoice.amount * 0.826, // Approximation si pas de détail
    totalVat: invoice.amount * 0.174,
    totalInclVat: invoice.amount
  };

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
        {companyInfo.logo_url ? (
          <img 
            src={companyInfo.logo_url} 
            alt={`${companyInfo.name} Logo`} 
            style={{ height: "10mm" }} 
          />
        ) : (
          <div style={{ 
            height: "10mm", 
            display: "flex", 
            alignItems: "center",
            fontSize: "10pt",
            fontWeight: "bold",
            color: "white"
          }}>
            {companyInfo.name}
          </div>
        )}
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
                  width: "35%" 
                }}>
                  DESCRIPTION
                </th>
                <th style={{ 
                  padding: "2mm", 
                  textAlign: "right", 
                  border: "0.2mm solid #e5e7eb", 
                  width: "13%" 
                }}>
                  P.U.
                </th>
                <th style={{ 
                  padding: "2mm", 
                  textAlign: "center", 
                  border: "0.2mm solid #e5e7eb", 
                  width: "8%" 
                }}>
                  QTÉ
                </th>
                <th style={{ 
                  padding: "2mm", 
                  textAlign: "right", 
                  border: "0.2mm solid #e5e7eb", 
                  width: "13%" 
                }}>
                  EXCL.
                </th>
                <th style={{ 
                  padding: "2mm", 
                  textAlign: "center", 
                  border: "0.2mm solid #e5e7eb", 
                  width: "8%" 
                }}>
                  TVA
                </th>
                <th style={{ 
                  padding: "2mm", 
                  textAlign: "right", 
                  border: "0.2mm solid #e5e7eb", 
                  width: "13%" 
                }}>
                  INCL.
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
                      textAlign: "right", 
                      border: "0.2mm solid #e5e7eb" 
                    }}>
                      {formatCurrency(item.unit_price_excl_vat || item.unit_price || 0)}
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
                      {formatCurrency(item.total_excl_vat || item.total || 0)}
                    </td>
                    <td style={{ 
                      padding: "2mm", 
                      textAlign: "center", 
                      border: "0.2mm solid #e5e7eb" 
                    }}>
                      {item.vat_rate || 21}%
                    </td>
                    <td style={{ 
                      padding: "2mm", 
                      textAlign: "right", 
                      border: "0.2mm solid #e5e7eb" 
                    }}>
                      {formatCurrency(item.total_incl_vat || item.total || 0)}
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
                    textAlign: "right", 
                    border: "0.2mm solid #e5e7eb" 
                  }}>
                    {formatCurrency(totals.totalExclVat)}
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
                    {formatCurrency(totals.totalExclVat)}
                  </td>
                  <td style={{ 
                    padding: "2mm", 
                    textAlign: "center", 
                    border: "0.2mm solid #e5e7eb" 
                  }}>
                    21%
                  </td>
                  <td style={{ 
                    padding: "2mm", 
                    textAlign: "right", 
                    border: "0.2mm solid #e5e7eb" 
                  }}>
                    {formatCurrency(totals.totalInclVat)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Récapitulatif TVA */}
        <div style={{ 
          margin: "0 0 5mm 0",
          padding: "3mm",
          backgroundColor: "#f9fafb",
          borderRadius: "1mm",
          border: "0.2mm solid #e5e7eb"
        }}>
          <h3 style={{ 
            fontSize: "9pt", 
            fontWeight: "bold", 
            margin: "0 0 2mm 0",
            color: "#1A2C3A"
          }}>
            Récapitulatif TVA
          </h3>
          
          <table style={{ 
            width: "100%", 
            borderCollapse: "collapse", 
            fontSize: "8pt"
          }}>
            <thead>
              <tr style={{ backgroundColor: "#e5e7eb" }}>
                <th style={{ padding: "1mm", textAlign: "left", border: "0.2mm solid #d1d5db" }}>Taux TVA</th>
                <th style={{ padding: "1mm", textAlign: "right", border: "0.2mm solid #d1d5db" }}>EXCL. TVA</th>
                <th style={{ padding: "1mm", textAlign: "right", border: "0.2mm solid #d1d5db" }}>TVA</th>
                <th style={{ padding: "1mm", textAlign: "right", border: "0.2mm solid #d1d5db" }}>INCL. TVA</th>
              </tr>
            </thead>
            <tbody>
              {vatSummary.length > 0 ? (
                vatSummary.map((vat: any, index: number) => (
                  <tr key={index}>
                    <td style={{ padding: "1mm", border: "0.2mm solid #d1d5db" }}>{vat.rate}%</td>
                    <td style={{ padding: "1mm", textAlign: "right", border: "0.2mm solid #d1d5db" }}>
                      {formatCurrency(vat.totalExclVat)}
                    </td>
                    <td style={{ padding: "1mm", textAlign: "right", border: "0.2mm solid #d1d5db" }}>
                      {formatCurrency(vat.vatAmount)}
                    </td>
                    <td style={{ padding: "1mm", textAlign: "right", border: "0.2mm solid #d1d5db" }}>
                      {formatCurrency(vat.totalInclVat)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={{ padding: "1mm", border: "0.2mm solid #d1d5db" }}>21%</td>
                  <td style={{ padding: "1mm", textAlign: "right", border: "0.2mm solid #d1d5db" }}>
                    {formatCurrency(totals.totalExclVat)}
                  </td>
                  <td style={{ padding: "1mm", textAlign: "right", border: "0.2mm solid #d1d5db" }}>
                    {formatCurrency(totals.totalVat)}
                  </td>
                  <td style={{ padding: "1mm", textAlign: "right", border: "0.2mm solid #d1d5db" }}>
                    {formatCurrency(totals.totalInclVat)}
                  </td>
                </tr>
              )}
              <tr style={{ backgroundColor: "#f3f4f6", fontWeight: "bold" }}>
                <td style={{ padding: "2mm", border: "0.2mm solid #d1d5db" }}>TOTAUX</td>
                <td style={{ padding: "2mm", textAlign: "right", border: "0.2mm solid #d1d5db" }}>
                  {formatCurrency(totals.totalExclVat)}
                </td>
                <td style={{ padding: "2mm", textAlign: "right", border: "0.2mm solid #d1d5db" }}>
                  {formatCurrency(totals.totalVat)}
                </td>
                <td style={{ padding: "2mm", textAlign: "right", border: "0.2mm solid #d1d5db", fontSize: "10pt", color: "#2563EB" }}>
                  {formatCurrency(totals.totalInclVat)}
                </td>
              </tr>
            </tbody>
          </table>
          
          {invoice.integration_type && (
            <p style={{ fontSize: "8pt", margin: "2mm 0 0 0", textAlign: "center" }}>
              Facture générée via {invoice.integration_type}
            </p>
          )}
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