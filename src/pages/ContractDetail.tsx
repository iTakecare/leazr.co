import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import PageTransition from "@/components/layout/PageTransition";
import ContractDetailHeader from "@/components/contracts/ContractDetailHeader";
import ContractWorkflowPanel from "@/components/contracts/ContractWorkflowPanel";
import ContractHistoryPanel from "@/components/contracts/ContractHistoryPanel";
import ContractEquipmentSection from "@/components/contracts/ContractEquipmentSection";
import ContractDocumentsSection from "@/components/contracts/ContractDocumentsSection";
import ContractEquipmentSerialManager from "@/components/contracts/ContractEquipmentSerialManager";
import ContractPurchaseTracking from "@/components/contracts/ContractPurchaseTracking";
import ContractDatesManager from "@/components/contracts/ContractDatesManager";
import ContractSelfLeasingCard from "@/components/contracts/ContractSelfLeasingCard";
import ContractSpecialProvisionsCard from "@/components/contracts/ContractSpecialProvisionsCard";
import ContractTerminationToggle from "@/components/contracts/ContractTerminationToggle";
import MollieSepaCard from "@/components/contracts/MollieSepaCard";
import ContractBreakevenCard from "@/components/contracts/ContractBreakevenCard";
import { useContractDetail } from "@/hooks/useContractDetail";
import { useAuth } from "@/context/AuthContext";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
const ContractDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { navigateToAdmin } = useRoleNavigation();
  const { user, isLoading: authLoading } = useAuth();
  const { companyId } = useMultiTenant();
  
  const {
    contract,
    equipment,
    documents,
    logs,
    loading,
    error,
    refetch
  } = useContractDetail(id || "");

  useEffect(() => {
    console.log("🔐 CONTRACT DETAIL - Vérification authentification:", { 
      user: user?.email, 
      authLoading,
      contractId: id 
    });
    
    if (!authLoading && !user) {
      console.log("🔐 CONTRACT DETAIL - Utilisateur non authentifié, redirection vers login");
      navigate("/login");
    }
  }, [user, authLoading, navigate, id]);
  // Afficher un loader pendant la vérification d'authentification
  if (authLoading) {
    return (
      <PageTransition>
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <span className="ml-2">Vérification de l'authentification...</span>
        </div>
      </PageTransition>
    );
  }

  // Si pas d'utilisateur authentifié, on ne devrait pas arriver ici (useEffect redirige)
  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <span className="ml-2">Chargement du contrat...</span>
        </div>
      </PageTransition>
    );
  }

  if (error || !contract) {
    return (
      <PageTransition>
        <div className="container mx-auto p-6">
          <div className="flex flex-col items-center justify-center h-96 gap-4">
            <div className="text-destructive font-medium text-center">
              {error || "Le contrat n'a pas été trouvé."}
            </div>
            <Button 
              onClick={() => navigateToAdmin("contracts")}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à la liste des contrats
            </Button>
            {error?.includes("reconnecter") && (
              <Button 
                onClick={() => navigate("/login")}
                variant="default"
              >
                Se reconnecter
              </Button>
            )}
          </div>
        </div>
      </PageTransition>
    );
  }
  return <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Header modernisé */}
        <ContractDetailHeader contract={contract} onRefresh={refetch} />
        
        <div className="container mx-auto p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne principale */}
            <div className="lg:col-span-2 space-y-6">
              {/* Workflow Panel */}
              <ContractWorkflowPanel contract={contract} onRefresh={refetch} />

              {/* Gestion des dates */}
              <ContractDatesManager 
                contractId={contract.id}
                deliveryDate={contract.delivery_date}
                contractStartDate={contract.contract_start_date}
                leaserName={contract.leaser_name}
                leaserId={contract.leaser_id}
                onUpdate={refetch}
              />

              {/* Dispositions particulières - self-leasing only */}
              <ContractSpecialProvisionsCard 
                contractId={contract.id}
                isSelfLeasing={contract.is_self_leasing || false}
                initialContent={contract.special_provisions}
                onUpdate={refetch}
              />

              {/* Section Numéros de série */}
              <ContractEquipmentSerialManager 
                contractId={contract.id}
                onUpdate={refetch}
              />

              {/* Section Suivi des achats */}
              <ContractPurchaseTracking 
                contractId={contract.id}
                onUpdate={refetch}
              />

              {/* Section Documents */}
              <ContractDocumentsSection contractId={contract.id} documents={documents} onRefresh={refetch} />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Carte contrat self-leasing */}
              <ContractSelfLeasingCard 
                contract={contract}
                onContractUpdated={refetch}
              />

              {/* Carte prélèvement SEPA Mollie - self-leasing uniquement */}
              {contract.is_self_leasing && companyId && (
                <MollieSepaCard 
                  contract={{
                    id: contract.id,
                    client_name: contract.client_name,
                    client_email: contract.client_email,
                    monthly_payment: contract.monthly_payment,
                    contract_duration: contract.contract_duration,
                    lease_duration: contract.lease_duration,
                    mollie_customer_id: contract.mollie_customer_id,
                    mollie_mandate_id: contract.mollie_mandate_id,
                    mollie_mandate_status: contract.mollie_mandate_status,
                    mollie_subscription_id: contract.mollie_subscription_id,
                  }}
                  companyId={companyId}
                  onSuccess={() => refetch()}
                />
              )}

              {/* Carte rentabilité breakeven - self-leasing uniquement */}
              {contract.is_self_leasing && (
                <ContractBreakevenCard 
                  contract={{
                    monthly_payment: contract.monthly_payment || 0,
                    contract_start_date: contract.contract_start_date || null,
                    contract_duration: contract.contract_duration || contract.lease_duration || null
                  }}
                  equipmentCost={equipment.reduce((sum, eq) => 
                    sum + (((eq.actual_purchase_price ?? eq.purchase_price) || 0) * (eq.quantity || 1)), 0
                  )}
                />
              )}

              {/* Toggle de terminaison - visible pour contrats actifs/prolongés */}
              <ContractTerminationToggle 
                contract={contract}
                onUpdate={refetch}
              />

              {/* Historique / Timeline de signature */}
              <ContractHistoryPanel logs={logs} contract={contract} />
            </div>
          </div>
        </div>

        {/* Section Équipements en pleine largeur */}
        <div className="w-full px-6">
          <ContractEquipmentSection 
            equipment={equipment} 
            contractId={contract.id}
            clientId={contract.client_id || ''}
            onRefresh={refetch} 
          />
        </div>
      </div>
    </PageTransition>;
};
export default ContractDetail;