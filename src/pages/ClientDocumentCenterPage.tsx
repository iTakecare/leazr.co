import React, { useEffect, useState } from "react";
import { FileText, Download, FileSignature, FolderOpen, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useClientData } from "@/hooks/useClientData";
import { useClientContracts } from "@/hooks/useClientContracts";
import { supabase } from "@/integrations/supabase/client";
import {
  ClientPage, ClientPageHeader, ClientCard, clientColors, badgeStyle, ClientEmptyState,
} from "@/components/client/clientUi";

interface ContractDoc {
  id: string;
  contract_id: string;
  document_type: string | null;
  file_name: string | null;
  file_path: string | null;
  status: string | null;
  created_at?: string;
}

const DOC_TYPE_LABEL: Record<string, string> = {
  contrat_signe: "Contrat signé",
  bon_livraison: "Bon de livraison",
  bon_commande: "Bon de commande",
  facture: "Facture",
  autre: "Autre",
};

const ClientDocumentCenterPage: React.FC = () => {
  const { user } = useAuth();
  const { clientData } = useClientData();
  const { contracts, loading } = useClientContracts(user?.email, clientData?.id);
  const [docs, setDocs] = useState<ContractDoc[]>([]);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);

  useEffect(() => {
    const ids = contracts.map((c: any) => c.id);
    if (ids.length === 0) { setDocs([]); return; }
    (async () => {
      const { data } = await supabase
        .from("contract_documents")
        .select("id, contract_id, document_type, file_name, file_path, status, created_at")
        .in("contract_id", ids)
        .order("created_at", { ascending: false });
      setDocs((data || []) as ContractDoc[]);
    })();
  }, [contracts]);

  // Télécharge le contrat signé : URL stockée, sinon récupération Grenke à la volée.
  const downloadSigned = async (contract: any) => {
    if (contract.signed_contract_pdf_url) {
      window.open(contract.signed_contract_pdf_url, "_blank");
      return;
    }
    if (!contract.offer_id) {
      toast.info("Le contrat signé n'est pas encore disponible.");
      return;
    }
    setPdfLoading(contract.id);
    try {
      const { data, error } = await supabase.functions.invoke("grenke-api", {
        body: { action: "get_contract_doc", offer_id: contract.offer_id },
      });
      if (error || !data?.success || !data?.signed_contract_pdf_url) {
        toast.info("Le contrat signé n'est pas encore disponible pour ce contrat.");
        return;
      }
      window.open(data.signed_contract_pdf_url, "_blank");
    } catch {
      toast.error("Impossible de récupérer le contrat signé.");
    } finally {
      setPdfLoading(null);
    }
  };

  const downloadDoc = async (d: ContractDoc) => {
    if (!d.file_path) return;
    try {
      const { data, error } = await supabase.storage.from("contract-documents").createSignedUrl(d.file_path, 120);
      if (error || !data?.signedUrl) throw error;
      window.open(data.signedUrl, "_blank");
    } catch {
      toast.error("Téléchargement impossible.");
    }
  };

  const docsByContract = (contractId: string) => docs.filter((d) => d.contract_id === contractId);
  const hasAny = contracts.length > 0;

  if (loading) {
    return (
      <ClientPage maxWidth={1040}>
        <ClientPageHeader title="Mes documents" subtitle="Retrouvez vos contrats signés et documents." />
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: clientColors.faint, padding: "20px 0" }}>
          <Loader2 size={16} className="animate-spin" /> Chargement…
        </div>
      </ClientPage>
    );
  }

  return (
    <ClientPage maxWidth={1040}>
      <ClientPageHeader title="Mes documents" subtitle="Retrouvez vos contrats signés et documents de financement." />

      {!hasAny ? (
        <ClientEmptyState
          icon={<FolderOpen size={48} color={clientColors.faint} />}
          title="Aucun document"
          description="Vos contrats signés et documents apparaîtront ici."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {contracts.map((c: any) => {
            const cDocs = docsByContract(c.id);
            return (
              <ClientCard key={c.id} style={{ overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", borderBottom: cDocs.length ? `1px solid ${clientColors.borderSoft}` : "none" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, background: "#EAF0FF", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                    <FileSignature size={20} color={clientColors.indigo} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: clientColors.ink }}>
                      {[c.leaser_name, c.contract_number].filter(Boolean).join(" · ") || "Contrat"}
                    </div>
                    <div style={{ fontSize: 12.5, color: clientColors.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                      {c.signed_contract_pdf_url ? (
                        <><ShieldCheck size={13} color={clientColors.emerald} /> Contrat signé disponible</>
                      ) : (
                        "Contrat signé non disponible"
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => downloadSigned(c)}
                    disabled={pdfLoading === c.id}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 15px", borderRadius: 10,
                      border: 0, background: "linear-gradient(135deg,#3D6BFF,#2D55E5)", color: "#fff", fontWeight: 600, fontSize: 13,
                      cursor: "pointer", flex: "none", opacity: pdfLoading === c.id ? 0.7 : 1,
                    }}
                  >
                    {pdfLoading === c.id ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                    Contrat signé
                  </button>
                </div>

                {cDocs.length > 0 && (
                  <div style={{ padding: "10px 18px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {cDocs.map((d) => (
                      <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", background: clientColors.surface, border: `1px solid ${clientColors.borderSoft}`, borderRadius: 11 }}>
                        <FileText size={16} color={clientColors.faint} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: clientColors.ink }}>
                            {d.file_name || DOC_TYPE_LABEL[d.document_type || ""] || "Document"}
                          </div>
                          <div style={{ fontSize: 11.5, color: clientColors.faint }}>
                            {DOC_TYPE_LABEL[d.document_type || ""] || d.document_type}
                          </div>
                        </div>
                        {d.status && <span style={badgeStyle("#EEF0F4", "#667085")}>{d.status}</span>}
                        <button onClick={() => downloadDoc(d)} title="Télécharger" style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #E2E5EC", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "none" }}>
                          <Download size={14} color="#475569" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </ClientCard>
            );
          })}
        </div>
      )}
    </ClientPage>
  );
};

export default ClientDocumentCenterPage;
