import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useContractDetail } from "@/hooks/useContractDetail";
import { useClientData } from "@/hooks/useClientData";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import ClientContractDetailHeader from "@/components/contracts/ClientContractDetailHeader";
import ClientContractEquipmentSection from "@/components/contracts/ClientContractEquipmentSection";
import ContractDocumentsSection from "@/components/contracts/ContractDocumentsSection";
import ContractHistoryPanel from "@/components/contracts/ContractHistoryPanel";

import { formatEquipmentForClient } from "@/utils/clientEquipmentFormatter";
import { FileSignature, Download, Loader2, ShieldCheck, ChevronLeft, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseClient } from "@/integrations/supabase/client";
import {
  ClientPage, ClientCard, clientColors, primaryBtnStyle, ghostBtnStyle,
} from "@/components/client/clientUi";

/** Carte de téléchargement du contrat signé (DocuSign via Grenke). */
const SignedContractCard: React.FC<{ contract: any }> = ({ contract }) => {
  const [loading, setLoading] = useState(false);
  const signedAt = contract.contract_signed_at
    ? new Date(contract.contract_signed_at).toLocaleDateString("fr-FR")
    : null;

  const handleDownload = async () => {
    if (contract.signed_contract_pdf_url) {
      window.open(contract.signed_contract_pdf_url, "_blank");
      return;
    }
    if (!contract.offer_id) {
      toast.info("Le contrat signé n'est pas encore disponible.");
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.functions.invoke("grenke-api", {
        body: { action: "get_contract_doc", offer_id: contract.offer_id },
      });
      if (error || !data?.success || !data?.signed_contract_pdf_url) {
        toast.error(data?.message || "Le contrat signé n'est pas encore disponible. Réessayez une fois le dossier finalisé.");
        return;
      }
      window.open(data.signed_contract_pdf_url, "_blank");
      toast.success("Contrat signé récupéré ✓");
    } catch {
      toast.error("Erreur lors de la récupération du contrat signé.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ClientCard pad={20}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: "#F2EBFE", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <FileSignature size={17} color={clientColors.violet} />
        </div>
        <span style={{ fontSize: 14.5, fontWeight: 700, color: clientColors.ink }}>Contrat signé</span>
      </div>
      <p style={{ fontSize: 13, color: clientColors.muted, margin: "0 0 14px" }}>
        {signedAt
          ? `Signé électroniquement (DocuSign) le ${signedAt}.`
          : "Document de contrat signé électroniquement via DocuSign."}
      </p>
      <button
        onClick={handleDownload}
        disabled={loading}
        style={{ ...primaryBtnStyle, width: "100%", opacity: loading ? 0.7 : 1 }}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        {contract.signed_contract_pdf_url ? "Télécharger le contrat signé" : "Récupérer le contrat signé"}
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 11.5, color: clientColors.faint }}>
        <ShieldCheck size={14} color={clientColors.emerald} />
        Signature qualifiée DocuSign · valeur probante
      </div>
    </ClientCard>
  );
};

const ClientContractDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { clientData } = useClientData();
  const { navigateToClient } = useRoleNavigation();
  const {
    contract,
    equipment,
    documents,
    logs,
    loading,
    error,
    refetch
  } = useContractDetail(id || "");

  if (loading) {
    return (
      <ClientPage maxWidth={1180}>
        <div className="animate-pulse" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ height: 30, width: "40%", background: "#E6E9EF", borderRadius: 12 }} />
          <div style={{ height: 150, background: "#E6E9EF", borderRadius: 18 }} />
          <div style={{ height: 280, background: "#E6E9EF", borderRadius: 18 }} />
        </div>
      </ClientPage>
    );
  }

  if (error || !contract) {
    return (
      <ClientPage maxWidth={1180}>
        <ClientCard pad={20} style={{ border: "1px solid #F5C2C2", background: "#FEF2F2", display: "flex", alignItems: "center", gap: 12, color: "#B91C1C" }}>
          <AlertCircle size={20} />
          <p style={{ fontSize: 13, margin: 0 }}>{error || "Le contrat n'a pas été trouvé."}</p>
        </ClientCard>
      </ClientPage>
    );
  }

  return (
    <ClientPage maxWidth={1180}>
      {/* Back */}
      <button
        onClick={() => navigateToClient("contracts")}
        style={{ ...ghostBtnStyle, marginBottom: 16, height: 34 }}
      >
        <ChevronLeft size={16} /> Mes contrats
      </button>

      {/* Header + KPI */}
      <ClientContractDetailHeader contract={contract} />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)", gap: 18, alignItems: "start", marginTop: 18 }} className="lzr-detail-grid">
        {/* Colonne principale */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
          <ClientContractEquipmentSection equipment={equipment} />
          <ContractDocumentsSection
            contractId={contract.id}
            documents={documents}
            onRefresh={refetch}
          />
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
          <SignedContractCard contract={contract} />
          <ContractHistoryPanel logs={logs} />
          {contract.equipment_description && (
            <ClientCard pad={20}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: clientColors.ink, marginBottom: 8 }}>
                Résumé des équipements
              </div>
              <p style={{ fontSize: 13, color: clientColors.muted, margin: 0 }}>
                {formatEquipmentForClient(contract.equipment_description)}
              </p>
            </ClientCard>
          )}
        </div>
      </div>

      <style>{`@media (max-width: 880px){ .lzr-detail-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </ClientPage>
  );
};

export default ClientContractDetailPage;
