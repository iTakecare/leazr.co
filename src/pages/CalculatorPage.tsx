
import React, { useState, useEffect } from "react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { Calculator as CalcIcon } from "lucide-react";
import { useEquipmentCalculator } from "@/hooks/useEquipmentCalculator";
import { defaultLeasers } from "@/data/leasers";
import EquipmentForm from "@/components/offer/EquipmentForm";
import EquipmentList from "@/components/offer/EquipmentList";
import ClientInfo from "@/components/offer/ClientInfo";
import ClientSelector, { ClientSelectorClient } from "@/components/ui/ClientSelector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Client } from "@/types/client";
import { createOffer } from "@/services/offers";
import { calculateFinancedAmount } from "@/utils/calculator";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const CalculatorPage = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [selectedLeaser, setSelectedLeaser] = useState(defaultLeasers[0]);
  const [client, setClient] = useState<Client | null>(null);
  const [clientSelectorOpen, setClientSelectorOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const calculator = useEquipmentCalculator(selectedLeaser);

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

  const handleSaveOffer = async () => {
    if (!client) {
      toast.error("Veuillez d'abord sélectionner un client");
      return;
    }
    if (calculator.equipmentList.length === 0) {
      toast.error("Veuillez ajouter au moins un équipement");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const totalMonthlyPayment = calculator.equipmentList.reduce(
        (sum, item) => sum + (item.monthlyPayment || 0) * item.quantity,
        0
      );
      
      const equipmentDescription = JSON.stringify(
        calculator.equipmentList.map(eq => ({
          id: eq.id,
          title: eq.title,
          purchasePrice: eq.purchasePrice,
          quantity: eq.quantity,
          margin: eq.margin,
          monthlyPayment: eq.monthlyPayment || totalMonthlyPayment / calculator.equipmentList.length,
          attributes: eq.attributes || {},
          specifications: eq.specifications || {}
        }))
      );
      
      const currentCoefficient = calculator.coefficient || calculator.globalMarginAdjustment.newCoef || 3.27;
      const financedAmount = calculateFinancedAmount(totalMonthlyPayment, currentCoefficient);
      
      const marginAmount = calculator.globalMarginAdjustment.amount || 0;
      const marginDifference = calculator.globalMarginAdjustment.marginDifference || 0;
      const totalMarginWithDifference = marginAmount + marginDifference;
      
      const offerData = {
        client_id: client.id,
        client_name: client.name,
        client_email: client.email,
        equipment_description: equipmentDescription,
        amount: calculator.globalMarginAdjustment.amount + calculator.equipmentList.reduce((sum, eq) => sum + eq.purchasePrice * eq.quantity, 0),
        coefficient: calculator.globalMarginAdjustment.newCoef,
        monthly_payment: totalMonthlyPayment,
        commission: 0, // Offre interne
        financed_amount: financedAmount,
        workflow_status: "draft",
        type: "internal_offer",
        user_id: user?.id || "",
        remarks: remarks,
        total_margin_with_difference: String(totalMarginWithDifference),
        margin: String(marginAmount)
      };
      
      const { data, error } = await createOffer(offerData);
      
      if (error) {
        console.error("Erreur lors de la sauvegarde:", error);
        toast.error(`Impossible de sauvegarder l'offre: ${error.message || 'Erreur inconnue'}`);
        return;
      }
      
      toast.success("Offre créée avec succès!");
      // Optionnel: naviguer vers la liste des offres
      // navigate("/offers");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de l'offre:", error);
      toast.error("Impossible de sauvegarder l'offre");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <Container>
        <ClientSelector 
          isOpen={clientSelectorOpen} 
          onClose={() => setClientSelectorOpen(false)} 
          onSelectClient={handleSelectClient}
          selectedClientId={client?.id || ""}
          onClientSelect={() => {}}
        />
        
        <div className="py-3 px-3">
          <div className="max-w-7xl mx-auto space-y-3">
            <div className="flex items-center gap-3 mb-4">
              <CalcIcon className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">
                Calculateur de Mensualités
              </h1>
            </div>
            
            {/* Layout côte à côte */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Calculateur - Colonne gauche */}
              <div className="space-y-3">
                <Card>
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-base">Ajouter un équipement</CardTitle>
                    <CardDescription className="text-xs">
                      Calculez les mensualités de leasing pour vos équipements
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 px-3 pb-3">
                    <EquipmentForm 
                      equipment={calculator.equipment}
                      setEquipment={calculator.setEquipment}
                      selectedLeaser={selectedLeaser}
                      addToList={calculator.addToList}
                      editingId={calculator.editingId}
                      cancelEditing={calculator.cancelEditing}
                      onOpenCatalog={() => {}}
                      coefficient={calculator.coefficient}
                      monthlyPayment={calculator.monthlyPayment}
                      targetMonthlyPayment={calculator.targetMonthlyPayment}
                      setTargetMonthlyPayment={calculator.setTargetMonthlyPayment}
                      calculatedMargin={calculator.calculatedMargin}
                      applyCalculatedMargin={calculator.applyCalculatedMargin}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Liste des équipements - Colonne droite */}
              <div className="space-y-3">
                <Card>
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-base">Liste des équipements calculés</CardTitle>
                    <CardDescription className="text-xs">
                      Gérez vos équipements et leurs mensualités
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 px-3 pb-3">
                    <EquipmentList 
                      equipmentList={calculator.equipmentList}
                      startEditing={calculator.startEditing}
                      removeFromList={calculator.removeFromList}
                      updateQuantity={calculator.updateQuantity}
                      editingId={calculator.editingId}
                      totalMonthlyPayment={calculator.totalMonthlyPayment}
                      globalMarginAdjustment={calculator.globalMarginAdjustment}
                      toggleAdaptMonthlyPayment={calculator.toggleAdaptMonthlyPayment}
                    />
                  </CardContent>
                </Card>
                
                {/* Section client déplacée ici */}
                <ClientInfo
                  clientId={client?.id || null}
                  clientName={client?.name || ""}
                  clientEmail={client?.email || ""}
                  clientCompany={client?.company || ""}
                  remarks={remarks}
                  setRemarks={setRemarks}
                  onOpenClientSelector={handleOpenClientSelector}
                  handleSaveOffer={handleSaveOffer}
                  isSubmitting={isSubmitting}
                  selectedLeaser={selectedLeaser}
                  equipmentList={calculator.equipmentList}
                  hideFinancialDetails={!isAdmin()}
                />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </PageTransition>
  );
};

export default CalculatorPage;
