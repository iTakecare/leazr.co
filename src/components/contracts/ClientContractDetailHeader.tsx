import React from "react";
import { Calendar, User, Package, Euro, FileText, Truck } from "lucide-react";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Contract } from "@/services/contractService";
import { getEquipmentSummary } from "@/utils/clientEquipmentFormatter";
import { ClientCard, StatusBadge, clientColors } from "@/components/client/clientUi";

interface ClientContractDetailHeaderProps {
  contract: Contract;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Contrat actif",
  completed: "Terminé",
  contract_sent: "Contrat à signer",
  contract_signed: "Signé",
  signed: "Signé",
  equipment_ordered: "Équipement commandé",
  delivered: "Livré",
  extended: "Prolongé",
  cancelled: "Annulé",
  pending: "En attente",
};

const KpiTile: React.FC<{
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}> = ({ icon, iconBg, label, value, sub }) => (
  <div style={{ background: clientColors.surface, border: `1px solid ${clientColors.borderSoft}`, borderRadius: 14, padding: "14px 16px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <div style={{ width: 28, height: 28, borderRadius: 9, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
        {icon}
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: clientColors.muted }}>{label}</span>
    </div>
    <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.01em", color: clientColors.ink, lineHeight: 1.2, wordBreak: "break-word" }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 12, color: clientColors.faint, marginTop: 2 }}>{sub}</div>}
  </div>
);

const ClientContractDetailHeader: React.FC<ClientContractDetailHeaderProps> = ({ contract }) => {
  const { navigateToClient } = useRoleNavigation();
  const equipmentSummary = getEquipmentSummary(contract.equipment_description);
  const statusLabel = STATUS_LABELS[contract.status] || "Contrat actif";

  return (
    <ClientCard pad={22}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.02em", margin: 0, color: clientColors.ink }}>
            Mon contrat de financement
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6, flexWrap: "wrap", fontSize: 13, color: clientColors.muted }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Calendar size={14} color={clientColors.faint} />
              Démarré le {formatDate(contract.contract_start_date || contract.created_at)}
            </span>
            {contract.offer_id && contract.offer_dossier_number && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <FileText size={14} color={clientColors.faint} />
                Demande{" "}
                <button
                  onClick={() => navigateToClient(`offers/${contract.offer_id}`)}
                  style={{ fontFamily: "monospace", fontWeight: 700, color: clientColors.indigo, background: "none", border: 0, padding: 0, cursor: "pointer" }}
                >
                  #{contract.offer_dossier_number}
                </button>
              </span>
            )}
          </div>
        </div>
        <StatusBadge status={contract.status} label={statusLabel} />
      </div>

      {/* Quick KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12, marginTop: 18 }} className="lzr-kpi-grid">
        <KpiTile
          icon={<Package size={15} color={clientColors.indigo} />}
          iconBg="#EAF0FF"
          label="Équipements"
          value={equipmentSummary.description}
          sub={`${equipmentSummary.count} ${equipmentSummary.count === 1 ? "unité" : "unités"}`}
        />
        <KpiTile
          icon={<Euro size={15} color={clientColors.emerald} />}
          iconBg="#E7F6F0"
          label="Mensualité"
          value={formatCurrency(contract.monthly_payment)}
          sub="Financement en cours"
        />
        <KpiTile
          icon={<User size={15} color={clientColors.indigo} />}
          iconBg="#EAF0FF"
          label="Bailleur"
          value={contract.leaser_name || "Non spécifié"}
          sub="Partenaire financier"
        />
      </div>

      {contract.tracking_number && (
        <div style={{ marginTop: 14, padding: "12px 16px", background: "#F0F4FF", border: "1px solid #DBE6FF", borderRadius: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700, color: "#1D4ED8" }}>
            <Truck size={15} /> Suivi de livraison
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#1E3A8A", margin: "4px 0 0" }}>{contract.tracking_number}</p>
          {contract.delivery_carrier && (
            <p style={{ fontSize: 12.5, color: clientColors.indigo, margin: "2px 0 0" }}>
              Transporteur : {contract.delivery_carrier}
            </p>
          )}
        </div>
      )}

      <style>{`@media (max-width: 720px){ .lzr-kpi-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </ClientCard>
  );
};

export default ClientContractDetailHeader;
