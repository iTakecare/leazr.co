import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import ClientInfo from "@/components/offer/ClientInfo";
import EquipmentForm from "@/components/offer/EquipmentForm";
import EquipmentList from "@/components/offer/EquipmentList";
import { Equipment, Leaser, GlobalMarginAdjustment } from "@/types/equipment";
import PageTransition from "@/components/layout/PageTransition";
import Container from "@/components/layout/Container";
import { useAuth } from "@/context/AuthContext";
import { v4 as uuidv4 } from "uuid";
import { useEquipmentCalculator } from "@/hooks/useEquipmentCalculator";
import { defaultLeasers } from "@/data/leasers";
import { Calculator as CalcIcon, Loader2 } from "lucide-react";
import ClientSelector, { ClientSelectorClient } from "@/components/ui/ClientSelector";
import { Client } from "@/types/client";
import { getAllClients } from "@/services/clientService";
import { createOffer } from "@/services/offers";
import LeaserSelector from "@/components/ui/LeaserSelector";
import LeaserButton from "@/components/offer/LeaserButton";
import { calculateFinancedAmount } from "@/utils/calculator";
import { getLeasers } from "@/services/leaserService";

const CreateOffer = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientSelectorOpen, setClientSelectorOpen] = useState(false);
  const [leaserSelectorOpen, setLeaserSelectorOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [calculatedCommission, setCalculatedCommission] = useState(0);

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
        const fetchedLeasers = await getLeasers();
        
        if (fetchedLeasers && fetchedLeasers.length > 0) {
          setSelectedLeaser(fetchedLeasers[0]);
        }
      } catch (error) {
        console.error("Error fetching leasers:", error);
        toast.error("Impossible de charger les prestataires de leasing. Utilisation des données par défaut.");
      }
    };
    
    fetchLeasers();
  }, []);

  const fetchClient = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setClient(data);
    } catch (error) {
      console.error("Erreur lors du chargement du client:", error);
      toast.error("Impossible de charger les informations du client");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenClientSelector = () => {
    setClientSelectorOpen(true);
  };

  const handleSelectClient = (selectedClient: ClientSelectorClient) => {
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
  
  const handleCommissionCalculated = (amount: number) => {
    console.log("Commission calculée reçue:", amount);
    setCalculatedCommission(amount);
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

      const equipmentDescription = JSON.stringify(
        equipmentList.map(eq => ({
          id: eq.id,
          title: eq.title,
          purchasePrice: eq.purchasePrice,
          quantity: eq.quantity,
          margin: eq.margin,
          monthlyPayment: eq.monthlyPayment || totalMonthlyPayment / equipmentList.length
        }))
      );

      const currentCoefficient = coefficient || globalMarginAdjustment.newCoef || 3.27;
      const financedAmount = calculateFinancedAmount(totalMonthlyPayment, currentCoefficient);

      const offerData = {
        client_id: client.id,
        client_name: client.name,
        client_email: client.email,
        equipment_description: equipmentDescription,
        amount: globalMarginAdjustment.amount + equipmentList.reduce((sum, eq) => sum + (eq.purchasePrice * eq.quantity), 0),
        coefficient: currentCoefficient,
        monthly_payment: totalMonthlyPayment,
        commission: 0, // Valeur par défaut à 0
        financed_amount: financedAmount,
        workflow_status: "draft",
        type: "offer",
        user_id: user?.id || "",
        remarks: remarks
      };

      console.log("Saving offer with the following data:", offerData);

      const { data, error } = await createOffer(offerData);

      if (error) {
        console.error("Erreur lors de la sauvegarde:", error);
        toast.error(`Impossible de sauvegarder l'offre: ${error.message || 'Erreur inconnue'}`);
        return;
      }

      toast.success("Offre créée avec succès!");

      navigate("/offers");
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
    hideFinancialDetails: !isAdmin()
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

  const hideFinancialDetails = !isAdmin();

  return (
    <PageTransition>
      <Container>
        <ClientSelector
          isOpen={clientSelectorOpen}
          onClose={() => setClientSelectorOpen(false)}
          onSelectClient={handleSelectClient}
          selectedClientId=""
          onClientSelect={() => { }}
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
                  Calculateur de Mensualités iTakecare
                </h1>
              </div>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => navigate('/offers')}
                >
                  Retour
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Chargement...</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <div className="mb-4">
                      <LeaserButton 
                        selectedLeaser={selectedLeaser} 
                        onOpen={handleOpenLeaserSelector} 
                      />
                    </div>
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
                        hideFinancialDetails={hideFinancialDetails}
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
                      hideFinancialDetails={hideFinancialDetails}
                      onCommissionCalculated={handleCommissionCalculated}
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
                      hideFinancialDetails={hideFinancialDetails}
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

export default CreateOffer;
