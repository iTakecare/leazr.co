
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
import { Switch } from "@/components/ui/switch";

const CreateOffer = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientSelectorOpen, setClientSelectorOpen] = useState(false);
  const [leaserSelectorOpen, setLeaserSelectorOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [isInternalOffer, setIsInternalOffer] = useState(true);

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

      // Déterminer si l'offre est interne (sans commission) ou normale
      const offerType = isInternalOffer ? 'internal_offer' : 'partner_offer';
      
      // Variable pour stocker la commission
      let commissionAmount = 0;
      
      // Pour les offres internes, la commission est toujours 0
      if (isInternalOffer) {
        commissionAmount = 0;
        console.log("Offre interne - commission à 0");
      } else {
        // SOLUTION DIRECTE: Récupérer la valeur exacte affichée dans l'interface utilisateur
        const commissionElement = document.querySelector('.commission-value');
        
        console.log("Recherche de l'élément de commission:", commissionElement);
        
        if (commissionElement) {
          try {
            // Extraire la valeur numérique en supprimant le symbole € et tout autre texte
            const commissionText = commissionElement.textContent || '';
            // Nettoyer la chaîne de caractères pour récupérer seulement le nombre
            const numericValue = commissionText.replace(/[^0-9,\.]/g, '').replace(',', '.');
            commissionAmount = parseFloat(numericValue);
            
            console.log("Commission extraite directement de l'UI:", commissionText, "->", commissionAmount);
            
            if (isNaN(commissionAmount)) {
              console.warn("Échec de l'extraction de la commission depuis l'UI, utilisation de la valeur par défaut");
              commissionAmount = Math.round(financedAmount * 0.03); // 3% par défaut
            }
          } catch (error) {
            console.error("Erreur lors de l'extraction de la commission depuis l'UI:", error);
            commissionAmount = Math.round(financedAmount * 0.03);
          }
        } else {
          console.warn("Élément de commission non trouvé dans le DOM, utilisation de la valeur par défaut");
          commissionAmount = Math.round(financedAmount * 0.03);
        }
      }

      // Log final de la commission à sauvegarder
      console.log("COMMISSION FINALE À SAUVEGARDER:", commissionAmount);

      // Récupérer la valeur de marge totale avec différence
      const totalMarginWithDifference = globalMarginAdjustment.marginDifference
        ? parseFloat(globalMarginAdjustment.marginDifference) + parseFloat(equipmentList.reduce((sum, eq) => sum + ((eq.margin || 0) * eq.quantity), 0).toFixed(2))
        : parseFloat(equipmentList.reduce((sum, eq) => sum + ((eq.margin || 0) * eq.quantity), 0).toFixed(2));

      console.log("Marge totale avec différence:", totalMarginWithDifference);

      const offerData = {
        client_id: client.id,
        client_name: client.name,
        client_email: client.email,
        client_company: client.company || "",
        equipment_description: equipmentDescription,
        amount: globalMarginAdjustment.amount + equipmentList.reduce((sum, eq) => sum + (eq.purchasePrice * eq.quantity), 0),
        coefficient: globalMarginAdjustment.newCoef,
        monthly_payment: totalMonthlyPayment,
        commission: commissionAmount,
        financed_amount: financedAmount,
        workflow_status: "draft",
        type: offerType,
        user_id: user?.id || "",
        remarks: remarks,
        margin: parseFloat(equipmentList.reduce((sum, eq) => sum + ((eq.margin || 0) * eq.quantity), 0).toFixed(2)),
        margin_difference: globalMarginAdjustment.marginDifference || 0,
        total_margin_with_difference: totalMarginWithDifference || 0
      };

      console.log("Saving offer with the following data:", offerData);
      console.log("Commission value being saved:", commissionAmount);
      console.log("Margin difference being saved:", globalMarginAdjustment.marginDifference);
      console.log("Total margin with difference being saved:", totalMarginWithDifference);

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
                    
                    <div className="mb-6 p-4 border border-blue-200 bg-blue-50 rounded-lg shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <label htmlFor="is_internal_offer" className="text-base font-medium text-blue-800">
                            Offre interne (sans commission)
                          </label>
                          <p className="text-sm text-blue-600 mt-1">
                            Cette offre sera marquée comme interne et n'aura pas de commission associée.
                          </p>
                        </div>
                        <Switch
                          id="is_internal_offer"
                          checked={isInternalOffer}
                          onCheckedChange={setIsInternalOffer}
                          className="data-[state=checked]:bg-blue-600"
                        />
                      </div>
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
