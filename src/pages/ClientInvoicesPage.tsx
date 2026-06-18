import React, { useMemo } from "react";
import { Download, FileText, Receipt } from "lucide-react";
import { useClientInvoices } from "@/hooks/useClientInvoices";
import {
  ClientPage, ClientPageHeader, ClientCard, KpiCard, StatusBadge, badgeStyle,
  clientColors, ClientEmptyState,
} from "@/components/client/clientUi";

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  paid: { label: "Payée", bg: "#E7F6F0", fg: "#047857" },
  sent: { label: "À payer", bg: "#FEF3C7", fg: "#B45309" },
  pending: { label: "En attente", bg: "#FFF0E6", fg: "#C2540B" },
  overdue: { label: "En retard", bg: "#FEEFEF", fg: "#B91C1C" },
  credited: { label: "Avoir", bg: "#EEF0F4", fg: "#667085" },
  partial_credit: { label: "Avoir partiel", bg: "#E8EBFD", fg: "#4338CA" },
  draft: { label: "Brouillon", bg: "#EEF0F4", fg: "#667085" },
};

const fmtAmount = (n: number | null) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

const typeLabel = (t: string | null) => (t === "purchase" ? "Achat" : t === "leasing" ? "Leasing" : t || "");

const ClientInvoicesPage: React.FC = () => {
  const { invoices, loading } = useClientInvoices();

  const stats = useMemo(() => {
    const total = invoices.reduce((s, i) => s + (i.amount || 0), 0);
    const paid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + (i.amount || 0), 0);
    const due = invoices
      .filter((i) => i.status !== "paid" && i.status !== "credited")
      .reduce((s, i) => s + (i.amount || 0), 0);
    return { total, paid, due, count: invoices.length };
  }, [invoices]);

  if (loading) {
    return (
      <ClientPage maxWidth={1040}>
        <ClientPageHeader title="Mes factures" subtitle="Consultez et téléchargez vos factures." />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <ClientCard key={i} pad={16} style={{ height: 72, opacity: 0.6 }}>
              <div className="animate-pulse" style={{ height: 14, width: "40%", background: "#EEF0F4", borderRadius: 6 }} />
            </ClientCard>
          ))}
        </div>
      </ClientPage>
    );
  }

  return (
    <ClientPage maxWidth={1040}>
      <ClientPageHeader title="Mes factures" subtitle="Consultez et téléchargez vos factures." />

      {invoices.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 22 }}>
          <KpiCard
            icon={<Receipt size={19} color={clientColors.indigo} />}
            iconBg="#EAF0FF"
            value={fmtAmount(stats.total)}
            label={`${stats.count} facture${stats.count > 1 ? "s" : ""}`}
          />
          <KpiCard icon={<Receipt size={19} color={clientColors.emerald} />} iconBg="#E7F6F0" value={fmtAmount(stats.paid)} label="Payé" />
          <KpiCard icon={<Receipt size={19} color={clientColors.orange} />} iconBg="#FFF0E6" value={fmtAmount(stats.due)} label="Restant dû" />
        </div>
      )}

      {invoices.length === 0 ? (
        <ClientEmptyState
          icon={<FileText size={48} color={clientColors.faint} />}
          title="Aucune facture"
          description="Vos factures apparaîtront ici dès qu'elles seront émises."
        />
      ) : (
        <ClientCard style={{ overflow: "hidden" }}>
          {/* En-têtes (desktop) */}
          <div
            className="max-md:hidden"
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr 1fr 1fr 0.8fr",
              gap: 12,
              padding: "13px 20px",
              background: clientColors.surface,
              borderBottom: `1px solid ${clientColors.borderSoft}`,
              fontSize: 11,
              fontWeight: 700,
              color: clientColors.faint,
              textTransform: "uppercase",
              letterSpacing: ".04em",
            }}
          >
            <span>Facture</span>
            <span>Date</span>
            <span>Échéance</span>
            <span style={{ textAlign: "right" }}>Montant</span>
            <span style={{ textAlign: "right" }}>PDF</span>
          </div>

          {invoices.map((inv) => {
            const s = STATUS[inv.status || ""] || { label: inv.status || "—", bg: "#EEF0F4", fg: "#667085" };
            return (
              <div
                key={inv.id}
                className="max-md:flex max-md:flex-col max-md:gap-1.5"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1fr 1fr 1fr 0.8fr",
                  gap: 12,
                  padding: "14px 20px",
                  borderBottom: `1px solid #F1F3F6`,
                  alignItems: "center",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: clientColors.ink }}>
                      {inv.invoice_number || "Facture"}
                    </span>
                    <span style={badgeStyle(s.bg, s.fg)}>{s.label}</span>
                  </div>
                  <div style={{ fontSize: 12, color: clientColors.faint, marginTop: 2 }}>
                    {typeLabel(inv.invoice_type)}
                    {inv.leaser_name ? ` · ${inv.leaser_name}` : ""}
                  </div>
                </div>
                <span style={{ fontSize: 13, color: clientColors.muted }}>{fmtDate(inv.invoice_date)}</span>
                <span style={{ fontSize: 13, color: clientColors.muted }}>{fmtDate(inv.due_date)}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: clientColors.ink, textAlign: "right" }}>
                  {fmtAmount(inv.amount)}
                </span>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  {inv.pdf_url ? (
                    <a
                      href={inv.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Télécharger la facture"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        height: 34,
                        padding: "0 12px",
                        borderRadius: 9,
                        border: `1px solid #E2E5EC`,
                        background: "#fff",
                        color: "#475569",
                        fontSize: 12.5,
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      <Download size={14} /> PDF
                    </a>
                  ) : (
                    <span style={{ fontSize: 12, color: clientColors.faint }}>—</span>
                  )}
                </div>
              </div>
            );
          })}
        </ClientCard>
      )}
    </ClientPage>
  );
};

export default ClientInvoicesPage;
