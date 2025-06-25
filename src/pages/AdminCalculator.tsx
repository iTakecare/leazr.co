
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import ClientInfo from "@/components/offer/ClientInfo";
import EquipmentForm from "@/components/offer/EquipmentForm";
import EquipmentList from "@/components/offer/EquipmentList";
import { Equipment, Leaser, GlobalMarginAdjustment } from "@/types/equipment";
import PageTransition from "@/components/layout/PageTransition";
import Container from "@/components/layout/Container";
import { v4 as uuidv4 } from "uuid";
import { useEquipmentCalculator } from "@/hooks/useEquipmentCalculator";
import { defaultLeasers } from "@/data/leasers";
import { Calculator as CalcIcon, Loader2 } from "lucide-react";
import ClientSelector, { ClientSelectorClient } from "@/components/ui/ClientSelector";
import { Client } from "@/types/client";
import { createOffer } from "@/services/offers";
import { saveEquipment } from "@/services/offerService";
import LeaserSelector from "@/components/ui/LeaserSelector";
import { getLeasers } from "@/services/leaserService";
import OffersLoading from "@/components/offers/OffersLoading";
import { calculateFinancedAmount } from "@/utils/calculator";
import { toast } from "sonner";

const AdminCalculator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLeasers, setLoadingLeasers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientSelectorOpen, setClientSelectorOpen] = useState(false);
  const [leaserSelectorOpen, setLeaserSelectorOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  
  const [selectedLeaser, setSelectedLeaser] = useState<Leaser | null>(defaultLeasers[0]);
  
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
    setGlobalMarginAdjustment,
    editingId,
    applyCalculatedMargin,
    addToList,
    startEditing,
    cancelEditing,
    removeFromList,
    updateQuantity,
    findCoefficient,
    toggleAdaptMonthlyPayment
  } = useEquipmentCalculator(selectedLeaser);
  
  useEffect(() => {
    const fetchLeasers = async () => {
      try {
        setLoadingLeasers(true);
        const fetchedLeasers = await getLeasers();
        
        if (fetchedLeasers && fetchedLeasers.length > 0) {
          setSelectedLeaser(fetchedLeasers[0]);
        }
      } catch (error) {
        console.error("Error fetching leasers:", error);
        toast.error("Impossible de charger les prestataires de leasing. Utilisation des données par défaut.");
      } finally {
        setLoadingLeasers(false);
      }
    };
    
    fetchLeasers();
  }, []);
  
  const handleOpenClientSelector = () => {
    setClientSelectorOpen(true);
  };
  
  const handleSelectClient = (selectedClient: ClientSelectorClient) => {
    console.log("Selected client in AdminCalculator:", selectedClient);
    setClient({
      id: selectedClient.id,
      name: selectedClient.name,
      email: selectedClient.email || "",
      company: selectedClient.company || "",
      created_at: new Date(),
      updated_at: new Date()
    });
  };
  
  const handleOpenLeaserSelector = () => {
    setLeaserSelectorOpen(true);
  };
  
  const handleLeaserSelect = (leaser: Leaser) => {
    setSelectedLeaser(leaser);
    setLeaserSelectorOpen(false);
  };
  
  const handleOpenCatalog = () => {
    // Fonctionnalité à implémenter si nécessaire
  };
  
  const handleSaveOffer = async () => {
    if (!client) {
      toast.error("Veuillez d'abord sélectionner un client");
      return;
    }
    
    if (equipmentList.length === 0) {
      toast.error("Veuillez ajouter au moins un équipement");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const totalMonthlyPayment = equipmentList.reduce(
        (sum, item) => sum + ((item.monthlyPayment || 0) * item.quantity),
        0
      );
      
      const totalPurchasePrice = equipmentList.reduce(
        (sum, item) => sum + (item.purchasePrice * item.quantity),
        0
      );
      
      // Create equipment description with attributes for backward compatibility
      const equipmentDescription = JSON.stringify(
        equipmentList.map(eq => ({
          id: eq.id,
          title: eq.title,
          purchasePrice: eq.purchasePrice,
          quantity: eq.quantity,
          margin: eq.margin,
          monthlyPayment: eq.monthlyPayment || totalMonthlyPayment / equipmentList.length,
          attributes: eq.attributes || {}
        }))
      );
      
      const currentCoefficient = coefficient || globalMarginAdjustment.newCoef || 3.27;
      const financedAmount = calculateFinancedAmount(totalMonthlyPayment, currentCoefficient);
      
      // Pour les admins, pas de commission
      const commissionAmount = 0;
      
      // Convertir le montant de total_margin_with_difference en number
      const totalMarginWithDifference = globalMarginAdjustment.marginDifference || 0;
      
      // Récupérer la marge totale générée (sans la différence)
      const marginAmount = globalMarginAdjustment.amount || 0;
      
      const offerData = {
        client_id: client.id,
        client_name: client.name,
        client_email: client.email,
        equipment_description: equipmentDescription,
        amount: globalMarginAdjustment.amount + equipmentList.reduce((sum, eq) => sum + (eq.purchasePrice * eq.quantity), 0),
        coefficient: globalMarginAdjustment.newCoef,
        monthly_payment: totalMonthlyPayment,
        commission: commissionAmount,
        financed_amount: financedAmount,
        workflow_status: "draft",
        type: "admin_offer",
        user_id: user?.id || "",
        remarks: remarks,
        total_margin_with_difference: totalMarginWithDifference,
        margin: marginAmount
      };
      
      console.log("Saving admin offer with the following data:", offerData);
      
      const { data, error } = await createOffer(offerData);
      
      if (error) {
        console.error("Erreur lors de la sauvegarde:", error);
        toast.error(`Impossible de sauvegarder l'offre: ${error.message || 'Erreur inconnue'}`);
        return;
      }
      
      // Save each equipment individually
      if (data && data.id) {
        console.log("Saving individual equipment items for offer:", data.id);
        
        for (const equipmentItem of equipmentList) {
          try {
            const savedEquipment = await saveEquipment(
              {
                offer_id: data.id,
                title: equipmentItem.title,
                purchase_price: equipmentItem.purchasePrice,
                quantity: equipmentItem.quantity,
                margin: equipmentItem.margin,
                monthly_payment: equipmentItem.monthlyPayment || 0,
                serial_number: null
              },
              equipmentItem.attributes || {},
              {}
            );
            
            if (savedEquipment) {
              console.log("Equipment saved successfully:", savedEquipment.id);
            } else {
              console.error("Failed to save equipment:", equipmentItem.title);
            }
          } catch (equipmentError) {
            console.error("Error saving equipment:", equipmentItem.title, equipmentError);
          }
        }
      }
      
      toast.success("Offre créée avec succès!");
      
      navigate("/admin/offers");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de l'offre:", error);
      toast.error("Impossible de sauvegarder l'offre");
    } finally {
      setIsSubmitting(false);
    }
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
    hideFinancialDetails: false // Les admins voient tous les détails financiers
  };
  
  const handleAddEquipment = (title: string) => {
    setEquipment({
      id: crypto.randomUUID(),
      title: title || "",
      purchasePrice: 1000,
      quantity: 1,
      margin: 20,
      monthlyPayment: 0,
    });
  };
  
  const isPageLoading = loading || loadingLeasers;
  
  return (
    <PageTransition>
      <Container>
        <ClientSelector 
          isOpen={clientSelectorOpen} 
          onClose={() => setClientSelectorOpen(false)} 
          onSelectClient={handleSelectClient}
          selectedClientId={client?.id || ""}
          onClientSelect={() => {}}
          ambassadorMode={false}
        />
        
        <LeaserSelector
          isOpen={leaserSelectorOpen}
          onClose={() => setLeaserSelectorOpen(false)}
          onSelect={handleLeaserSelect}
          selectedLeaser={selectedLeaser}
        />
        
        <div className="py-12 px-4">
          <div className="max-w-[90rem] mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <CalcIcon className="h-8 w-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">
                  Calculateur Admin iTakecare
                </h1>
              </div>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => navigate('/admin/offers')}
                >
                  Retour aux offres
                </Button>
              </div>
            </div>

            {isPageLoading ? (
              <OffersLoading />
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <div className="mt-6">
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
                        hideFinancialDetails={false}
                      />
                    </div>
                  </div>

                  <div className="space-y-8">
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
                      hideFinancialDetails={false}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </Container>
    </PageTransition>
  );
};

export default AdminCalculator;
