
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import ClientInfo from "@/components/offer/ClientInfo";
import EquipmentForm from "@/components/offer/EquipmentForm";
import EquipmentList from "@/components/offer/EquipmentList";
import DiscountInput, { DiscountData } from "@/components/offer/DiscountInput";
import PageTransition from "@/components/layout/PageTransition";
import { Calculator as CalcIcon, AlertCircle } from "lucide-react";
import ClientSelector from "@/components/ui/ClientSelector";
import LeaserSelector from "@/components/ui/LeaserSelector";
import OffersLoading from "@/components/offers/OffersLoading";
import { useAmbassadorOfferState } from "@/hooks/useAmbassadorOfferState";
import { useAmbassadorOfferSave } from "@/components/ambassador/AmbassadorOfferSaveLogic";
import { useEquipmentCalculator } from "@/hooks/useEquipmentCalculator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getOfferEquipment } from "@/services/offers/offerEquipment";
import { getLeasers, getLeaserById } from "@/services/leaserService";

const AmbassadorCreateOffer = () => {
  const { id: editId } = useParams();
  const { navigateToAmbassador } = useRoleNavigation();
  const [productsToBeDetermined, setProductsToBeDetermined] = useState(false);
  const [estimatedBudget, setEstimatedBudget] = useState(0);
  const [isLoadingEditData, setIsLoadingEditData] = useState(false);
  const [editOfferData, setEditOfferData] = useState<any>(null);
  const [globalDiscount, setGlobalDiscount] = useState<DiscountData>({
    enabled: false,
    type: 'percentage',
    value: 0,
    discountAmount: 0,
    monthlyPaymentBeforeDiscount: 0,
    monthlyPaymentAfterDiscount: 0,
  });
  
  const isEditMode = !!editId;
  
  console.log("🎯 AmbassadorCreateOffer - Component rendered", { isEditMode, editId });
  
  // Wrap hooks in try-catch for error handling
  let hookStates = null;
  try {
    hookStates = useAmbassadorOfferState();
  } catch (error) {
    console.error("❌ Error in useAmbassadorOfferState:", error);
    return <div className="p-8 text-red-600">Erreur de chargement des données ambassadeur</div>;
  }

  const {
    client,
    setClient,
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
    setSelectedLeaser,
    selectedDuration,
    setSelectedDuration,
    ambassadorId,
    user,
    handleSelectClient,
    handleLeaserSelect
  } = hookStates;

  console.log("🎯 AmbassadorCreateOffer - Basic state:", {
    hasUser: !!user,
    loading,
    loadingLeasers,
    hasAmbassador: !!ambassador,
    hasSelectedLeaser: !!selectedLeaser
  });

  // Protection : rediriger si pas d'utilisateur authentifié
  React.useEffect(() => {
    if (!loading && !user) {
      console.log("🎯 AmbassadorCreateOffer - No user, redirecting to login");
      window.location.href = '/login';
      return;
    }
  }, [user, loading]);

  // Early return if essential data is missing
  if (!user && !loading) {
    console.log("🎯 AmbassadorCreateOffer - No user and not loading, returning null");
    return null;
  }

  // Wrap equipment calculator in try-catch
  let equipmentHook = null;
  try {
    equipmentHook = useEquipmentCalculator(selectedLeaser);
  } catch (error) {
    console.error("❌ Error in useEquipmentCalculator:", error);
    return <div className="p-8 text-red-600">Erreur de chargement du calculateur</div>;
  }

  const {
    equipment,
    setEquipment,
    monthlyPayment,
    targetMonthlyPayment,
    setTargetMonthlyPayment,
    coefficient,
    calculatedMargin,
    equipmentList,
    setEquipmentList,
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
  } = equipmentHook;

  // Calculate the correct total margin from calculations
  const totalMargin = calculations?.normalMarginAmount || 0;

  // Charger les données de l'offre existante en mode édition
  useEffect(() => {
    const loadExistingOffer = async () => {
      if (!editId || !user || loading || loadingLeasers) return;
      
      setIsLoadingEditData(true);
      console.log("🔍 AmbassadorCreateOffer - Loading existing offer:", editId);
      
      try {
        // 1. Récupérer l'offre
        const { data: offerData, error: offerError } = await supabase
          .from('offers')
          .select('*')
          .eq('id', editId)
          .single();
        
        if (offerError || !offerData) {
          console.error("❌ Error loading offer:", offerError);
          toast.error("Impossible de charger l'offre");
          navigateToAmbassador('offers');
          return;
        }
        
        console.log("✅ Offer loaded:", offerData);
        setEditOfferData(offerData);
        
        // 2. Charger le client
        if (offerData.client_id) {
          const { data: clientData } = await supabase
            .from('clients')
            .select('*')
            .eq('id', offerData.client_id)
            .single();
          
          if (clientData) {
            console.log("✅ Client loaded:", clientData.name);
            setClient(clientData);
          }
        }
        
        // 3. Charger le leaser
        if (offerData.leaser_id) {
          const leaser = await getLeaserById(offerData.leaser_id);
          if (leaser) {
            console.log("✅ Leaser loaded:", leaser.name);
            setSelectedLeaser(leaser);
          }
        }
        
        // 4. Charger la durée
        if (offerData.duration) {
          setSelectedDuration(offerData.duration);
        }
        
        // 5. Charger les remarques
        if (offerData.remarks) {
          setRemarks(offerData.remarks);
        }

        // 5b. Charger la remise commerciale si présente
        if (offerData.discount_amount && offerData.discount_amount > 0) {
          console.log("🏷️ Loading commercial discount:", {
            type: offerData.discount_type,
            value: offerData.discount_value,
            amount: offerData.discount_amount,
            beforeDiscount: offerData.monthly_payment_before_discount
          });
          setGlobalDiscount({
            enabled: true,
            type: offerData.discount_type || 'percentage',
            value: offerData.discount_value || 0,
            discountAmount: offerData.discount_amount,
            monthlyPaymentBeforeDiscount: offerData.monthly_payment_before_discount || 0,
            monthlyPaymentAfterDiscount: (offerData.monthly_payment_before_discount || 0) - offerData.discount_amount,
          });
        }
        
        // 6. Charger les équipements
        const equipmentData = await getOfferEquipment(editId);
        if (equipmentData && equipmentData.length > 0) {
          console.log("✅ Equipment loaded:", equipmentData.length, "items");
          
          // Convertir les données de la DB vers le format attendu par equipmentList
          const convertedEquipment = equipmentData.map((eq: any) => ({
            id: eq.id,
            title: eq.title,
            purchasePrice: eq.purchase_price || 0,
            quantity: eq.quantity || 1,
            margin: eq.margin || 20,
            monthlyPayment: eq.monthly_payment || 0,
            imageUrl: eq.image_url || null,
            specifications: eq.specifications || [],
            attributes: eq.attributes || []
          }));
          
          setEquipmentList(convertedEquipment);
        }
        
        toast.success("Offre chargée pour modification");
      } catch (error) {
        console.error("❌ Error loading offer data:", error);
        toast.error("Erreur lors du chargement de l'offre");
      } finally {
        setIsLoadingEditData(false);
      }
    };
    
    loadExistingOffer();
  }, [editId, user, loading, loadingLeasers]);

  // Wrap offer save hook in try-catch
  let offerSaveHook = null;
  try {
    offerSaveHook = useAmbassadorOfferSave({
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
      totalMargin,
      selectedLeaser,
      selectedDuration,
      editId,
      discountData: globalDiscount
    });
  } catch (error) {
    console.error("❌ Error in useAmbassadorOfferSave:", error);
    return <div className="p-8 text-red-600">Erreur de sauvegarde</div>;
  }

  const { handleSaveOffer, commissionData } = offerSaveHook;

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
                    {isEditMode ? "Modifier l'offre" : "Calculateur de Mensualités iTakecare"}
                    {/* Debug info pour la commission */}
                    {commissionData && commissionData.amount > 0 && (
                      <span className="ml-2 text-sm text-green-600">
                        (Commission: {commissionData.amount.toFixed(2)}€)
                      </span>
                    )}
                  </h1>
                </div>
                <div className="flex gap-4">
                  {isLoadingEditData && (
                    <span className="text-sm text-muted-foreground animate-pulse">
                      Chargement de l'offre...
                    </span>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => navigateToAmbassador('offers')}
                  >
                    Retour
                  </Button>
                </div>
              </div>

              {/* Temporarily remove loading condition to force display */}
              <div className="space-y-4">
                {isPageLoading && (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <p className="text-blue-700">Chargement en cours... (Debug: {loading ? 'ambassador' : ''} {loadingLeasers ? 'leasers' : ''})</p>
                  </div>
                )}
                
                {/* Products to be determined option */}
                <div className="px-2 mb-4">
                  <div className="flex items-start space-x-3 p-4 border border-border rounded-lg bg-muted/30">
                    <Checkbox
                      id="ambassador-products-tbd"
                      checked={productsToBeDetermined}
                      onCheckedChange={(checked) => setProductsToBeDetermined(checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="ambassador-products-tbd" className="text-sm font-medium cursor-pointer">
                        Produits à déterminer
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Créer une demande sans produits spécifiques pour scorer le client d'abord
                      </p>
                    </div>
                  </div>
                  
                  {productsToBeDetermined && (
                    <Alert className="mt-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-3">
                          <p className="text-sm">Mode qualification client activé.</p>
                          <div className="space-y-2">
                            <Label htmlFor="amb-estimated-budget">Budget estimé (€)</Label>
                            <Input
                              id="amb-estimated-budget"
                              type="number"
                              min="0"
                              step="100"
                              value={estimatedBudget}
                              onChange={(e) => setEstimatedBudget(parseFloat(e.target.value) || 0)}
                              placeholder="5000"
                              className="bg-background"
                            />
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                
                {!productsToBeDetermined && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 px-2">
                  <div className="xl:col-span-1">
                    {selectedLeaser ? (
                      <EquipmentForm
                        equipment={equipment || {}}
                        setEquipment={setEquipment}
                        selectedLeaser={selectedLeaser}
                        addToList={addToList}
                        editingId={editingId}
                        cancelEditing={cancelEditing}
                        onOpenCatalog={handleOpenCatalog}
                        coefficient={coefficient || 0}
                        monthlyPayment={monthlyPayment || 0}
                        targetMonthlyPayment={targetMonthlyPayment || 0}
                        setTargetMonthlyPayment={setTargetMonthlyPayment}
                        calculatedMargin={calculatedMargin || 0}
                        applyCalculatedMargin={applyCalculatedMargin}
                        hideFinancialDetails={true}
                        hidePurchasePrice={true}
                      />
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                        <p className="text-yellow-700">Pas de leaser sélectionné (Debug)</p>
                      </div>
                    )}
                  </div>

                  <div className="xl:col-span-1 space-y-8">
                    <EquipmentList
                      equipmentList={equipmentList || []}
                      editingId={editingId}
                      startEditing={startEditing}
                      removeFromList={removeFromList}
                      updateQuantity={updateQuantity}
                      totalMonthlyPayment={totalMonthlyPayment || 0}
                      globalMarginAdjustment={{
                        amount: globalMarginAdjustment?.amount || 0,
                        newCoef: globalMarginAdjustment?.newCoef || 0,
                        active: globalMarginAdjustment?.adaptMonthlyPayment || false,
                        marginDifference: globalMarginAdjustment?.marginDifference || 0
                      }}
                      toggleAdaptMonthlyPayment={toggleAdaptMonthlyPayment}
                      hideFinancialDetails={false}
                      ambassadorId={currentAmbassadorId}
                      commissionLevelId={currentCommissionLevelId}
                      hidePriceColumn={true}
                      calculations={calculations}
                    />

                    {/* Remise commerciale */}
                    {equipmentList.length > 0 && (
                      <DiscountInput
                        monthlyPayment={totalMonthlyPayment}
                        discountData={globalDiscount}
                        onDiscountChange={setGlobalDiscount}
                        showMarginImpact={false}
                        label="Remise commerciale"
                        compact={true}
                      />
                    )}
                    
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
      </div>
    </PageTransition>
  );
};

export default AmbassadorCreateOffer;
