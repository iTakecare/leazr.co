import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useContractDetail } from "@/hooks/useContractDetail";
import { useClientData } from "@/hooks/useClientData";
import PageTransition from "@/components/layout/PageTransition";
import ClientContractDetailHeader from "@/components/contracts/ClientContractDetailHeader";
import ClientContractEquipmentSection from "@/components/contracts/ClientContractEquipmentSection";
import ContractDocumentsSection from "@/components/contracts/ContractDocumentsSection";
import ContractHistoryPanel from "@/components/contracts/ContractHistoryPanel";

import { formatEquipmentForClient } from "@/utils/clientEquipmentFormatter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSignature, Download, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseClient } from "@/integrations/supabase/client";

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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSignature className="h-4 w-4 text-violet-600" />
          Contrat signé
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {signedAt
            ? `Signé électroniquement (DocuSign) le ${signedAt}.`
            : "Document de contrat signé électroniquement via DocuSign."}
        </p>
        <Button onClick={handleDownload} disabled={loading} className="w-full gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {contract.signed_contract_pdf_url ? "Télécharger le contrat signé" : "Récupérer le contrat signé"}
        </Button>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          Signature qualifiée DocuSign · valeur probante
        </div>
      </CardContent>
    </Card>
  );
};

const ClientContractDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { clientData } = useClientData();
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
      <PageTransition>
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </PageTransition>
    );
  }
  
  if (error || !contract) {
    return (
      <PageTransition>
        <div className="container mx-auto p-6">
          <div className="flex flex-col items-center justify-center h-96 gap-4">
            <div className="text-destructive font-medium">{error || "Le contrat n'a pas été trouvé."}</div>
          </div>
        </div>
      </PageTransition>
    );
  }
  
  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <ClientContractDetailHeader contract={contract} />
        
        <div className="container mx-auto p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne principale */}
            <div className="lg:col-span-2 space-y-6">
              {/* Section Équipements */}
              <ClientContractEquipmentSection 
                equipment={equipment} 
              />

              {/* Section Documents */}
              <ContractDocumentsSection 
                contractId={contract.id}
                documents={documents}
                onRefresh={refetch}
              />

            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contrat signé (DocuSign) */}
              <SignedContractCard contract={contract} />

              {/* Historique */}
              <ContractHistoryPanel logs={logs} />

              {/* Détails additionnels */}
              {contract.equipment_description && (
                <Card>
                  <CardHeader>
                    <CardTitle>Résumé des équipements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {formatEquipmentForClient(contract.equipment_description)}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default ClientContractDetailPage;