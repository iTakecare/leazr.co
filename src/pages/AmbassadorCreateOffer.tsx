
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ClientInfo from "@/components/offer/ClientInfo";
import EquipmentForm from "@/components/offer/EquipmentForm";
import EquipmentList from "@/components/offer/EquipmentList";
import PageTransition from "@/components/layout/PageTransition";
import { Calculator as CalcIcon } from "lucide-react";
import ClientSelector from "@/components/ui/ClientSelector";
import LeaserSelector from "@/components/ui/LeaserSelector";
import OffersLoading from "@/components/offers/OffersLoading";
import { useAmbassadorOfferState } from "@/hooks/useAmbassadorOfferState";
import { useAmbassadorOfferSave } from "@/components/ambassador/AmbassadorOfferSaveLogic";
import { useEquipmentCalculator } from "@/hooks/useEquipmentCalculator";

const AmbassadorCreateOffer = () => {
  const navigate = useNavigate();
  
  const {
    client,
    loading,
    loadingLeasers,
    isSubmitting,
    setIsSubmitting,
    ambassador,
    clientSelectorOpen,
    setClientSelectorOpen,
    leaserSelectorOpen,
    setLeaserSelectorOpen,
    remarks,
    setRemarks,
    selectedLeaser,
    ambassadorId,
    user,
    handleSelectClient,
    handleLeaserSelect
  } = useAmbassadorOfferState();

  // Only initialize useEquipmentCalculator when selectedLeaser is available
  const calculatorProps = (selectedLeaser && !loadingLeasers) ? 
    useEquipmentCalculator(selectedLeaser) : 
    {
      equipment: { id: '', title: '', name: '', purchasePrice: 0, margin: 0, monthlyPayment: 0, quantity: 1 },
      setEquipment: () => {},
      monthlyPayment: 0,
      targetMonthlyPayment: 0,
      setTargetMonthlyPayment: () => {},
      coefficient: 3.55,
      calculatedMargin: { percentage: 0, amount: 0 },
      equipmentList: [],
      totalMonthlyPayment: 0,
      globalMarginAdjustment: { 
        percentage: 0, 
        amount: 0, 
        newMonthly: 0, 
        currentCoef: 3.55, 
        newCoef: 3.55, 
        adaptMonthlyPayment: false, 
        marginDifference: 0 
      },
      editingId: null,
      applyCalculatedMargin: () => {},
      addToList: () => {},
      startEditing: () => {},
      cancelEditing: () => {},
      removeFromList: () => {},
      updateQuantity: () => {},
      toggleAdaptMonthlyPayment: () => {},
      calculations: { totalPurchasePrice: 0, totalFinancedAmount: 0, normalMarginAmount: 0, finalMonthlyPayment: 0, coefficient: 3.55 }
    };

  const {
    equipment,
    setEquipment,
    monthlyPayment,
    targetMonthlyPayment,
    setTargetMonthlyPayment,
    coefficient,
    calculatedMargin,
    equipmentList,
    totalMonthlyPayment,
    globalMarginAdjustment,
    editingId,
    applyCalculatedMargin,
    addToList,
    startEditing,
    cancelEditing,
    removeFromList,
    updateQuantity,
    toggleAdaptMonthlyPayment,
    calculations
  } = calculatorProps;

  // Calculate the correct total margin from calculations
  const totalMargin = calculations?.normalMarginAmount || 0;

  const { handleSaveOffer, commissionData } = useAmbassadorOfferSave({
    client,
    equipmentList,
    globalMarginAdjustment,
    coefficient,
    remarks,
    ambassadorId,
    ambassador,
    userId: user?.id,
    setIsSubmitting,
    totalMonthlyPayment,
    totalMargin
  });

  const handleOpenClientSelector = () => {
    setClientSelectorOpen(true);
  };

  const handleOpenCatalog = () => {
    // Fonctionnalité à implémenter si nécessaire
  };

  const clientInfoProps = {
    clientId: client?.id || null,
    clientName: client?.name || "",
    clientEmail: client?.email || "",
    clientCompany: client?.company || "",
    remarks: remarks,
    setRemarks: setRemarks,
    onOpenClientSelector: handleOpenClientSelector,
    handleSaveOffer: handleSaveOffer,
    isSubmitting: isSubmitting,
    selectedLeaser: selectedLeaser,
    equipmentList: equipmentList,
    hideFinancialDetails: true
  };

  const isPageLoading = loading || loadingLeasers;

  // Determine the correct ambassador ID and commission level ID
  const currentAmbassadorId = ambassadorId;
  const currentCommissionLevelId = ambassador?.commission_level_id;

  console.log("🔍 AmbassadorCreateOffer - Render debug:", {
    ambassadorId,
    currentAmbassadorId,
    ambassador: ambassador ? { id: ambassador.id, commission_level_id: ambassador.commission_level_id } : null,
    currentCommissionLevelId,
    totalMonthlyPayment,
    equipmentListLength: equipmentList.length,
    loading,
    userRole: user?.role,
    calculationsNormalMargin: calculations?.normalMarginAmount,
    totalMarginCalculated: totalMargin,
    commissionData
  });

  return (
    <PageTransition>
      <div className="min-h-screen bg-background flex w-full">
        <div className="flex-1 overflow-auto">
          <ClientSelector 
            isOpen={clientSelectorOpen} 
            onClose={() => setClientSelectorOpen(false)} 
            onSelectClient={handleSelectClient}
            selectedClientId={client?.id || ""}
            onClientSelect={() => {}}
            ambassadorMode={true}
            selectedAmbassadorId={ambassadorId}
          />
          
          <div className="py-8 px-20">
            <div className="max-w-full mx-auto">
              <div className="flex justify-between items-center mb-8 px-2">
                <div className="flex items-center gap-3">
                  <CalcIcon className="h-8 w-8 text-blue-600" />
                  <h1 className="text-2xl font-bold text-gray-900">
                    Calculateur de Mensualités iTakecare
                    {/* Debug info pour la commission */}
                    {commissionData && commissionData.amount > 0 && (
                      <span className="ml-2 text-sm text-green-600">
                        (Commission: {commissionData.amount.toFixed(2)}€)
                      </span>
                    )}
                  </h1>
                </div>
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/ambassador/offers')}
                  >
                    Retour
                  </Button>
                </div>
              </div>

              {isPageLoading ? (
                <OffersLoading />
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 px-2">
                  <div className="xl:col-span-1">
                    <EquipmentForm
                      equipment={equipment}
                      setEquipment={setEquipment}
                      selectedLeaser={selectedLeaser}
                      addToList={addToList}
                      editingId={editingId}
                      cancelEditing={cancelEditing}
                      onOpenCatalog={handleOpenCatalog}
                      coefficient={coefficient}
                      monthlyPayment={monthlyPayment}
                      targetMonthlyPayment={targetMonthlyPayment}
                      setTargetMonthlyPayment={setTargetMonthlyPayment}
                      calculatedMargin={calculatedMargin}
                      applyCalculatedMargin={applyCalculatedMargin}
                      hideFinancialDetails={true}
                    />
                  </div>

                  <div className="xl:col-span-1 space-y-8">
                    <EquipmentList
                      equipmentList={equipmentList}
                      editingId={editingId}
                      startEditing={startEditing}
                      removeFromList={removeFromList}
                      updateQuantity={updateQuantity}
                      totalMonthlyPayment={totalMonthlyPayment}
                      globalMarginAdjustment={{
                        amount: globalMarginAdjustment.amount,
                        newCoef: globalMarginAdjustment.newCoef,
                        active: globalMarginAdjustment.adaptMonthlyPayment,
                        marginDifference: globalMarginAdjustment.marginDifference
                      }}
                      toggleAdaptMonthlyPayment={toggleAdaptMonthlyPayment}
                      hideFinancialDetails={false}
                      ambassadorId={currentAmbassadorId}
                      commissionLevelId={currentCommissionLevelId}
                      hidePriceColumn={true}
                      calculations={calculations}
                    />
                    
                    <ClientInfo
                      clientId={clientInfoProps.clientId}
                      clientName={clientInfoProps.clientName}
                      clientEmail={clientInfoProps.clientEmail}
                      clientCompany={clientInfoProps.clientCompany}
                      remarks={clientInfoProps.remarks}
                      setRemarks={clientInfoProps.setRemarks}
                      onOpenClientSelector={clientInfoProps.onOpenClientSelector}
                      handleSaveOffer={clientInfoProps.handleSaveOffer}
                      isSubmitting={clientInfoProps.isSubmitting}
                      selectedLeaser={clientInfoProps.selectedLeaser}
                      equipmentList={clientInfoProps.equipmentList}
                      hideFinancialDetails={true}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default AmbassadorCreateOffer;
