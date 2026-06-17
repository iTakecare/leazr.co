import React, { useState } from "react";
import { FileText, Download, Eye, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useClientContracts } from "@/hooks/useClientContracts";
import { useClientData } from "@/hooks/useClientData";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { differenceInMonths, parseISO, format, addMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { getSupabaseClient } from "@/integrations/supabase/client";
import RenewalRequestModal from "@/components/client/RenewalRequestModal";
import {
  ClientPage, ClientPageHeader, ClientCard, ClientEmptyState,
  clientColors, ghostBtnStyle, badgeStyle,
} from "@/components/client/clientUi";

const STATUS_META: Record<string, { label: string; bg: string; fg: string }> = {
  active: { label: "Actif", bg: "#E7F6F0", fg: "#047857" },
  completed: { label: "Terminé", bg: "#EEF0F4", fg: "#667085" },
  contract_sent: { label: "Contrat à signer", bg: "#FEF3C7", fg: "#B45309" },
  contract_signed: { label: "Signé", bg: "#F2EBFE", fg: "#6D28D9" },
  signed: { label: "Signé", bg: "#F2EBFE", fg: "#6D28D9" },
  equipment_ordered: { label: "Équipement commandé", bg: "#E8EBFD", fg: "#4338CA" },
  delivered: { label: "Livré", bg: "#EAF0FF", fg: "#1D4ED8" },
  extended: { label: "Prolongé", bg: "#EAF0FF", fg: "#1D4ED8" },
  cancelled: { label: "Annulé", bg: "#FEEFEF", fg: "#B91C1C" },
  pending: { label: "En attente", bg: "#FFF0E6", fg: "#C2540B" },
};

const ClientContractsPage = () => {
  const { user } = useAuth();
  const { navigateToClient } = useRoleNavigation();
  const { clientData } = useClientData();
  const { contracts, loading, error } = useClientContracts(user?.email, clientData?.id);
  const [renewalContract, setRenewalContract] = useState<any>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);

  const formatEquipmentDescription = (description?: string) => {
    if (!description) return "Équipement non spécifié";
    try {
      const data = JSON.parse(description);
      if (Array.isArray(data) && data.length > 0) {
        const titles = data.map((item) => item.title).filter(Boolean);
        if (titles.length > 0)
          return titles.length > 1 ? `${titles[0]} + ${titles.length - 1} autre(s) équipement(s)` : titles[0];
      }
    } catch {
      return description;
    }
    return description;
  };

  const statusBadge = (status: string) => {
    const m = STATUS_META[status] || { label: status, bg: "#EEF0F4", fg: "#667085" };
    return <span style={badgeStyle(m.bg, m.fg)}>{m.label}</span>;
  };

  const getTimeline = (contract: any) => {
    const startDate = contract.contract_start_date ? parseISO(contract.contract_start_date) : null;
    const duration = contract.contract_duration || 36;
    const effectiveStart = startDate || parseISO(contract.created_at);
    const now = new Date();
    const monthsElapsed = Math.max(0, differenceInMonths(now, effectiveStart));
    const monthsElapsedDisplay = Math.min(monthsElapsed, duration); // jamais > durée à l'affichage
    const monthsRemaining = Math.max(0, duration - monthsElapsed);
    const progress = Math.min(100, Math.max(2, Math.round((monthsElapsed / duration) * 100)));
    const canRenew = monthsElapsed >= 18;
    const endDate = addMonths(effectiveStart, duration);
    return { monthsElapsed, monthsElapsedDisplay, monthsRemaining, progress, duration, canRenew, startDate: effectiveStart, endDate };
  };

  const showTimeline = (status: string) =>
    ["active", "signed", "contract_signed", "equipment_ordered", "delivered", "extended"].includes(status);

  const deliveryLabel = (contract: any) =>
    contract.delivery_status
      ? ({ en_attente: "En attente", expedie: "Expédié", livre: "Livré", delivered: "Livré" } as Record<string, string>)[contract.delivery_status] || contract.delivery_status
      : contract.status === "active"
        ? "Livré"
        : "En attente";

  const handleDownloadPdf = async (contract: any) => {
    if (contract.signed_contract_pdf_url) {
      window.open(contract.signed_contract_pdf_url, "_blank");
      return;
    }
    if (!contract.offer_id) {
      toast.info("Le PDF signé n'est pas encore disponible pour ce contrat.");
      return;
    }
    setPdfLoadingId(contract.id);
    try {
      const supabase = getSupabaseClient();
      const { data, error: invokeError } = await supabase.functions.invoke("grenke-api", {
        body: { action: "get_contract_doc", offer_id: contract.offer_id },
      });
      if (invokeError || !data?.success || !data?.signed_contract_pdf_url) {
        toast.error(data?.message || "Le contrat signé n'est pas encore disponible. Réessayez une fois le dossier finalisé.");
        return;
      }
      window.open(data.signed_contract_pdf_url, "_blank");
      toast.success("Contrat signé récupéré ✓");
    } catch {
      toast.error("Erreur lors de la récupération du contrat signé.");
    } finally {
      setPdfLoadingId(null);
    }
  };

  if (loading) {
    return (
      <ClientPage maxWidth={1080}>
        <div className="animate-pulse" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ height: 30, width: "33%", background: "#E6E9EF", borderRadius: 12 }} />
          {[1, 2].map((i) => <div key={i} style={{ height: 190, background: "#E6E9EF", borderRadius: 18 }} />)}
        </div>
      </ClientPage>
    );
  }

  if (error) {
    return (
      <ClientPage maxWidth={1080}>
        <ClientCard pad={20} style={{ border: "1px solid #F5C2C2", background: "#FEF2F2", display: "flex", alignItems: "center", gap: 12, color: "#B91C1C" }}>
          <AlertCircle size={20} />
          <p style={{ fontSize: 13, margin: 0 }}>Erreur lors du chargement des contrats : {error}</p>
        </ClientCard>
      </ClientPage>
    );
  }

  return (
    <ClientPage maxWidth={1080}>
      <ClientPageHeader
        title="Mes contrats"
        subtitle="Suivez l'avancement et le renouvellement de vos financements."
      />

      {contracts.length === 0 ? (
        <ClientEmptyState
          icon={<FileText size={48} color={clientColors.faint} />}
          title="Aucun contrat"
          description="Vous n'avez pas encore de contrats de financement."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {contracts.map((contract: any) => {
            const timeline = getTimeline(contract);
            const title = [contract.leaser_name, contract.contract_number].filter(Boolean).join(" · ") || "Contrat";
            const isPdfLoading = pdfLoadingId === contract.id;
            return (
              <ClientCard key={contract.id} radius={18} style={{ overflow: "hidden" }}>
                {/* Header */}
                <div style={{ padding: "18px 20px", display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: "#EAF0FF", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                    <FileText size={21} color={clientColors.indigo} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15.5, fontWeight: 700 }}>{title}</span>
                      {statusBadge(contract.status)}
                    </div>
                    <div style={{ fontSize: 12.5, color: clientColors.muted, marginTop: 3 }}>
                      {formatEquipmentDescription(contract.equipment_description)} · Créé le{" "}
                      {new Date(contract.created_at).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flex: "none" }}>
                    <button style={ghostBtnStyle} onClick={() => navigateToClient(`contracts/${contract.id}`)}>
                      <Eye size={15} /> Détails
                    </button>
                    <button
                      style={{ ...ghostBtnStyle, opacity: isPdfLoading ? 0.6 : 1 }}
                      disabled={isPdfLoading}
                      onClick={() => handleDownloadPdf(contract)}
                      title={contract.signed_contract_pdf_url ? "Télécharger le contrat signé" : "Récupérer le contrat signé"}
                    >
                      {isPdfLoading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                      PDF
                    </button>
                  </div>
                </div>

                {/* Info tiles */}
                <div style={{ padding: "0 20px 18px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                  <div style={{ background: "#FAFBFC", border: "1px solid #EEF0F4", borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11.5, color: clientColors.faint, fontWeight: 500 }}>Mensualité</div>
                    <div style={{ fontSize: 17, fontWeight: 800, marginTop: 2 }}>{formatAmount(contract.monthly_payment)}</div>
                  </div>
                  <div style={{ background: "#FAFBFC", border: "1px solid #EEF0F4", borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11.5, color: clientColors.faint, fontWeight: 500 }}>Bailleur</div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{contract.leaser_name || "Non spécifié"}</div>
                  </div>
                  <div style={{ background: "#FAFBFC", border: "1px solid #EEF0F4", borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11.5, color: clientColors.faint, fontWeight: 500 }}>Livraison</div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{deliveryLabel(contract)}</div>
                  </div>
                </div>

                {/* Timeline */}
                {showTimeline(contract.status) && (
                  <div style={{ margin: "0 20px 20px", padding: 18, borderRadius: 16, background: "linear-gradient(120deg,#F4F7FF,#F7F4FF)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: clientColors.indigo }}>Parcours du contrat</span>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: "#1A2233", background: "#fff", padding: "4px 11px", borderRadius: 20, border: "1px solid #E6E9EF" }}>
                        {timeline.monthsRemaining} mois restant{timeline.monthsRemaining > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div style={{ position: "relative", height: 10, background: "#fff", borderRadius: 10, overflow: "hidden", boxShadow: "inset 0 1px 2px rgba(16,24,40,.08)" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${timeline.progress}%`, borderRadius: 10, background: "linear-gradient(90deg,#3D6BFF,#7C3AED)", overflow: "hidden" }}>
                        <span style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(255,255,255,.6),transparent)", animation: "lzrShine 3s ease-in-out infinite" }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 9 }}>
                      <span style={{ fontSize: 11.5, color: clientColors.faint, fontWeight: 500 }}>{format(timeline.startDate, "MMM yyyy", { locale: fr })}</span>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: clientColors.indigo }}>{timeline.monthsElapsedDisplay}/{timeline.duration} mois · {timeline.progress}%</span>
                      <span style={{ fontSize: 11.5, color: clientColors.faint, fontWeight: 500 }}>{format(timeline.endDate, "MMM yyyy", { locale: fr })}</span>
                    </div>
                    {timeline.canRenew && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setRenewalContract(contract); }}
                        style={{ marginTop: 16, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, height: 42, border: 0, borderRadius: 12, background: "linear-gradient(135deg,#3D6BFF,#7C3AED)", color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer", boxShadow: "0 6px 16px rgba(91,60,200,.3)" }}
                      >
                        <RefreshCw size={16} /> Renouveler mon matériel
                      </button>
                    )}
                    {!timeline.canRenew && timeline.monthsElapsed >= 12 && (
                      <p style={{ fontSize: 11.5, textAlign: "center", color: clientColors.faint, margin: "12px 0 0" }}>
                        🔓 Renouvellement disponible dans {18 - timeline.monthsElapsed} mois
                      </p>
                    )}
                  </div>
                )}

                {/* Tracking */}
                {contract.tracking_number && (
                  <div style={{ margin: "0 20px 20px", padding: 12, background: "#F0F4FF", borderRadius: 12 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#1D4ED8", margin: 0 }}>
                      Numéro de suivi : {contract.tracking_number}
                    </p>
                    {contract.delivery_carrier && (
                      <p style={{ fontSize: 12.5, color: clientColors.indigo, margin: "2px 0 0" }}>
                        Transporteur : {contract.delivery_carrier}
                      </p>
                    )}
                  </div>
                )}
              </ClientCard>
            );
          })}
        </div>
      )}

      {renewalContract && clientData && (
        <RenewalRequestModal
          open={!!renewalContract}
          onOpenChange={(open) => !open && setRenewalContract(null)}
          contract={renewalContract}
          clientId={clientData.id}
          companyId={(clientData as any).company_id || ""}
        />
      )}
    </ClientPage>
  );
};

export default ClientContractsPage;
