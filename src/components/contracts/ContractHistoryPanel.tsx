import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, User, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import ContractStatusBadge from "./ContractStatusBadge";
import SignatureProgressTimeline from "./SignatureProgressTimeline";
import { ClientCard, clientColors } from "@/components/client/clientUi";

interface ContractHistoryPanelProps {
  logs: any[];
  contract?: {
    status?: string;
    signature_status?: string;
    client_iban?: string;
    signed_contract_pdf_url?: string;
    created_at?: string;
    contract_signed_at?: string;
  };
}

const PanelTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
    <div style={{ width: 34, height: 34, borderRadius: 10, background: "#EAF0FF", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
      <History size={17} color={clientColors.indigo} />
    </div>
    <span style={{ fontSize: 14.5, fontWeight: 700, color: clientColors.ink }}>{children}</span>
  </div>
);

const ContractHistoryPanel: React.FC<ContractHistoryPanelProps> = ({ logs, contract }) => {
  // Si pas de logs mais on a un contrat, afficher la timeline de progression
  if (logs.length === 0 && contract) {
    return (
      <ClientCard pad={20}>
        <PanelTitle>Statut de signature</PanelTitle>
        <SignatureProgressTimeline
          contractStatus={contract.status || 'draft'}
          signatureStatus={contract.signature_status}
          hasIBAN={!!contract.client_iban}
          hasPDF={!!contract.signed_contract_pdf_url}
          contractCreatedAt={contract.created_at || new Date().toISOString()}
          signedAt={contract.contract_signed_at}
        />
      </ClientCard>
    );
  }
  // Si pas de logs ET pas de contrat, afficher le message vide
  if (logs.length === 0) {
    return (
      <ClientCard pad={20}>
        <PanelTitle>Historique</PanelTitle>
        <div style={{ textAlign: "center", padding: "24px 0 8px" }}>
          <History size={40} color={clientColors.faint} style={{ margin: "0 auto 10px", display: "block" }} />
          <p style={{ fontSize: 13, color: clientColors.muted, margin: 0 }}>Aucun historique disponible</p>
        </div>
      </ClientCard>
    );
  }

  return (
    <ClientCard pad={20}>
      <PanelTitle>Historique ({logs.length})</PanelTitle>
      <ScrollArea className="h-96">
        <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingRight: 4 }}>
          {logs.map((log, index) => (
            <div key={`${log.id}-${index}`} style={{ position: "relative" }}>
              {/* Timeline line */}
              {index < logs.length - 1 && (
                <div style={{ position: "absolute", left: 15, top: 36, width: 2, height: "calc(100% - 4px)", background: clientColors.border }} />
              )}

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: "none", zIndex: 1 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#EAF0FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Clock size={15} color={clientColors.indigo} />
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, color: clientColors.ink }}>
                      <User size={12} color={clientColors.faint} />
                      {log.profiles?.first_name || log.user_name || 'Utilisateur système'}
                    </span>
                    <span style={{ fontSize: 11, color: clientColors.faint }}>{formatDate(log.created_at)}</span>
                  </div>

                  {log.previous_status !== log.new_status ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 12.5, color: clientColors.muted }}>
                      <span>Statut changé de</span>
                      <ContractStatusBadge status={log.previous_status} />
                      <span>à</span>
                      <ContractStatusBadge status={log.new_status} />
                    </div>
                  ) : (
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: clientColors.indigo }}>
                      Action sur le contrat
                    </div>
                  )}

                  {log.reason && (
                    <div style={{ fontSize: 12.5, color: clientColors.muted, background: clientColors.surface, border: `1px solid ${clientColors.borderSoft}`, borderRadius: 9, padding: "8px 10px" }}>
                      {log.reason}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </ClientCard>
  );
};

export default ContractHistoryPanel;
