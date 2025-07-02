import React from "react";
import { useParams } from "react-router-dom";
import { useContractDetail } from "@/hooks/useContractDetail";
import { useClientData } from "@/hooks/useClientData";
import PageTransition from "@/components/layout/PageTransition";
import ClientContractDetailHeader from "@/components/contracts/ClientContractDetailHeader";
import ClientContractEquipmentSection from "@/components/contracts/ClientContractEquipmentSection";
import ContractDocumentsSection from "@/components/contracts/ContractDocumentsSection";
import ContractHistoryPanel from "@/components/contracts/ContractHistoryPanel";
import EquipmentAssignmentManager from "@/components/equipment/EquipmentAssignmentManager";
import { formatEquipmentForClient } from "@/utils/clientEquipmentFormatter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Users } from "lucide-react";

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

              {/* Gestion des assignations d'équipements */}
              {clientData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Assignation des équipements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EquipmentAssignmentManager 
                      clientId={clientData.id}
                      readOnly={false}
                    />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
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