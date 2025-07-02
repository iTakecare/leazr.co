import React from "react";
import { useParams } from "react-router-dom";
import PageTransition from "@/components/layout/PageTransition";
import ContractDetailHeader from "@/components/contracts/ContractDetailHeader";
import ContractWorkflowPanel from "@/components/contracts/ContractWorkflowPanel";
import ContractHistoryPanel from "@/components/contracts/ContractHistoryPanel";
import ContractEquipmentSection from "@/components/contracts/ContractEquipmentSection";
import ContractDocumentsSection from "@/components/contracts/ContractDocumentsSection";
import { useContractDetail } from "@/hooks/useContractDetail";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
const ContractDetail = () => {
  const {
    id
  } = useParams<{
    id: string;
  }>();
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
    return <PageTransition>
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </PageTransition>;
  }
  if (error || !contract) {
    return <PageTransition>
        <div className="container mx-auto p-6">
          <div className="flex flex-col items-center justify-center h-96 gap-4">
            <div className="text-destructive font-medium">{error || "Le contrat n'a pas été trouvé."}</div>
          </div>
        </div>
      </PageTransition>;
  }
  return <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Header modernisé */}
        <ContractDetailHeader contract={contract} />
        
        <div className="container mx-auto p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne principale */}
            <div className="lg:col-span-2 space-y-6">
              {/* Workflow Panel */}
              <ContractWorkflowPanel contract={contract} onRefresh={refetch} />

              {/* Section Équipements */}
              <ContractEquipmentSection equipment={equipment} onRefresh={refetch} />

              {/* Section Documents */}
              <ContractDocumentsSection contractId={contract.id} documents={documents} onRefresh={refetch} />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Historique */}
              <ContractHistoryPanel logs={logs} />

              {/* Détails additionnels */}
              {contract.equipment_description}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>;
};
export default ContractDetail;