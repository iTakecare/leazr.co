import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Leaser } from "@/types/equipment";
import ProductSelector from "@/components/ui/ProductSelector";
import ClientSelector, { ClientSelectorClient } from "@/components/ui/ClientSelector";
import LeaserSelector from "@/components/ui/LeaserSelector";
import { createOffer, getOfferById, updateOffer } from "@/services/offerService";
import { getLeasers } from "@/services/leaserService";
import { getClientById } from "@/services/clientService";
import { defaultLeasers } from "@/data/leasers";
import { Calculator as CalcIcon, Loader2 } from "lucide-react";
import PageTransition from "@/components/layout/PageTransition";
import Container from "@/components/layout/Container";
import { calculateFinancedAmount } from "@/utils/calculator";

import EquipmentForm from "@/components/offer/EquipmentForm";
import EquipmentList from "@/components/offer/EquipmentList";
import ClientInfo from "@/components/offer/ClientInfo";
import LeaserButton from "@/components/offer/LeaserButton";
import { useSimplifiedEquipmentCalculator } from "@/hooks/useSimplifiedEquipmentCalculator";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const PartnerCreateOffer = () => {
  const { id } = useParams();
  const { navigateToPartner } = useRoleNavigation();
  const { user } = useAuth();
  const query = useQuery();
  const clientIdParam = query.get("client");
  const offerId = query.get("id");
  
  const [selectedLeaser, setSelectedLeaser] = useState<Leaser | null>(defaultLeasers[0]);
  
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [remarks, setRemarks] = useState('');
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isClientSelectorOpen, setIsClientSelectorOpen] = useState(false);
  const [isLeaserSelectorOpen, setIsLeaserSelectorOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const {
    equipment,
    setEquipment,
    monthlyPayment,
    targetMonthlyPayment,
    setTargetMonthlyPayment,
    coefficient,
    calculatedMargin,
    targetSalePrice,
    setTargetSalePrice,
    calculatedFromSalePrice,
    equipmentList,
    setEquipmentList,
    totalMonthlyPayment,
    globalMarginAdjustment,
    editingId,
    applyCalculatedMargin,
    applyCalculatedFromSalePrice,
    addToList,
    startEditing,
    cancelEditing,
    removeFromList,
    updateQuantity,
    findCoefficient,
    toggleAdaptMonthlyPayment,
    calculations
  } = useSimplifiedEquipmentCalculator(selectedLeaser);

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

  useEffect(() => {
    const loadClientFromParam = async () => {
      if (clientIdParam) {
        try {
          setLoading(true);
          const client = await getClientById(clientIdParam);
          if (client) {
            setClientId(client.id);
            setClientName(client.name);
            setClientEmail(client.email || "");
            setClientCompany(client.company || "");
          }
        } catch (error) {
          console.error("Error loading client:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadClientFromParam();
  }, [clientIdParam]);

  useEffect(() => {
    const loadOfferData = async () => {
      if (offerId) {
        try {
          setLoading(true);
          setIsEditMode(true);
          
          const offer = await getOfferById(offerId);
          if (offer) {
            console.log("Loaded offer data:", offer);
            setClientId(offer.client_id || null);
            setClientName(offer.client_name || '');
            setClientEmail(offer.client_email || '');
            setClientCompany(offer.clients?.company || '');
            setRemarks(offer.additional_info || '');
            
            if (offer.equipment_description) {
              try {
                const equipmentData = JSON.parse(offer.equipment_description);
                if (Array.isArray(equipmentData) && equipmentData.length > 0) {
                  console.log("Found JSON equipment data:", equipmentData);
                  const formattedEquipment = equipmentData.map(item => ({
                    id: item.id || crypto.randomUUID(),
                    title: item.title,
                    purchasePrice: parseFloat(item.purchasePrice) || 0,
                    quantity: parseInt(item.quantity, 10) || 1,
                    margin: parseFloat(item.margin) || 20,
                    monthlyPayment: parseFloat(item.monthlyPayment || 0)
                  }));
                  
                  console.log("Formatted equipment with preserved margins:", formattedEquipment);
                  setEquipmentList(formattedEquipment);
                  
                  if (offer.monthly_payment) {
                    const monthlyPayment = typeof offer.monthly_payment === 'string' 
                      ? parseFloat(offer.monthly_payment) 
                      : offer.monthly_payment;
                    setTargetMonthlyPayment(monthlyPayment || 0);
                  }
                }
              } catch (e) {
                console.log("Parsing equipment_description as string format:", offer.equipment_description);
                const equipmentItems = offer.equipment_description.split(',').map(item => {
                  const match = item.trim().match(/(.+) \((\d+)x\)/);
                  if (match) {
                    const title = match[1].trim();
                    const quantity = parseInt(match[2], 10);
                    
                    const totalCost = typeof offer.amount === 'string' 
                      ? parseFloat(offer.amount) 
                      : offer.amount || 0;
                    const approxPricePerItem = totalCost / (quantity || 1);
                    
                    return {
                      id: crypto.randomUUID(),
                      title,
                      purchasePrice: approxPricePerItem,
                      quantity,
                      margin: 20
                    };
                  }
                  return null;
                }).filter(Boolean);
                
                if (equipmentItems.length > 0) {
                  setEquipmentList(equipmentItems);
                  
                  const monthlyPayment = typeof offer.monthly_payment === 'string' 
                    ? parseFloat(offer.monthly_payment) 
                    : offer.monthly_payment || 0;
                  setTargetMonthlyPayment(monthlyPayment);
                }
              }
            }
            
            toast.success("Offre chargée avec succès");
          } else {
            toast.error("Impossible de trouver cette offre");
            navigateToPartner("offers");
          }
        } catch (error) {
          console.error("Error loading offer:", error);
          toast.error("Erreur lors du chargement de l'offre");
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadOfferData();
  }, [offerId, navigateToPartner, setEquipmentList, setTargetMonthlyPayment]);

  const handleProductSelect = (product: any) => {
    if (!selectedLeaser) return;
    
    console.log("Selected product:", product);
    
    const purchasePrice = product.price || 0;
    const monthlyPrice = product.monthly_price || 0;
    const coef = findCoefficient(purchasePrice);
    const margin = 20;
    
    setEquipment({
      id: crypto.randomUUID(),
      title: product.name,
      purchasePrice: purchasePrice,
      quantity: 1,
      margin: Number(margin),
    });

    if (monthlyPrice > 0) {
      console.log("Setting target monthly payment:", monthlyPrice);
      setTargetMonthlyPayment(monthlyPrice);
    }
    
    setIsCatalogOpen(false);
  };

  const handleClientSelect = (client: ClientSelectorClient) => {
    setClientId(client.id);
    setClientName(client.name);
    setClientEmail(client.email || '');
    setClientCompany(client.company || client.companyName || '');
  };

  const handleLeaserSelect = (leaser: Leaser) => {
    setSelectedLeaser(leaser);
    setIsLeaserSelectorOpen(false);
  };

  const handleOpenLeaserSelector = () => {
    setIsLeaserSelectorOpen(true);
  };

  const handleSaveOffer = async () => {
    if (!user) {
      toast.error("Vous devez être connecté pour créer une offre");
      return;
    }

    if (!clientName || !clientEmail || equipmentList.length === 0) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setIsSubmitting(true);

    try {
      const equipmentData = equipmentList.map(eq => ({
        id: eq.id,
        title: eq.title,
        purchasePrice: eq.purchasePrice,
        quantity: eq.quantity,
        margin: eq.margin,
        monthlyPayment: eq.monthlyPayment || totalMonthlyPayment / equipmentList.length
      }));
      
      console.log("Saving equipment data with preserved margins:", equipmentData);
      
      const equipmentDescription = equipmentList
        .map(eq => `${eq.title} (${eq.quantity}x)`)
        .join(", ");

      // Ensure all numeric values are properly handled
      const totalAmount = globalMarginAdjustment.amount + 
        equipmentList.reduce((sum, eq) => sum + (eq.purchasePrice * eq.quantity), 0);
      
      // Calculate financed amount
      const currentCoefficient = coefficient || globalMarginAdjustment.newCoef || 3.27;
      const financedAmount = calculateFinancedAmount(totalMonthlyPayment, currentCoefficient);

      // Convertir le montant de total_margin_with_difference en number au lieu de string
      const totalMarginWithDifference = globalMarginAdjustment.marginDifference || 0;

      const offerData = {
        user_id: user.id,
        client_name: clientName,
        client_email: clientEmail,
        client_id: clientId,
        equipment_description: JSON.stringify(equipmentData),
        equipment_text: equipmentDescription,
        amount: totalAmount,
        coefficient: globalMarginAdjustment.newCoef,
        monthly_payment: totalMonthlyPayment,
        commission: totalMonthlyPayment * 0.1,
        financed_amount: financedAmount,
        additional_info: remarks,
        type: 'partner_offer',
        total_margin_with_difference: totalMarginWithDifference
      };

      console.log("Saving offer with the following data:", offerData);
      console.log("Total margin with difference value being saved:", totalMarginWithDifference);

      let result;
      
      if (isEditMode && offerId) {
        result = await updateOffer(offerId, offerData);
        if (result) {
          toast.success("Offre mise à jour avec succès !");
        } else {
          throw new Error("Failed to update offer");
        }
      } else {
        result = await createOffer(offerData);
        if (result) {
          toast.success("Offre créée avec succès !");
        } else {
          throw new Error("Failed to create offer");
        }
      }
      
      navigateToPartner("dashboard");
    } catch (error) {
      console.error("Error saving offer:", error);
      toast.error("Une erreur s'est produite lors de l'enregistrement de l'offre");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <Container>
        <div className="py-12 px-4">
          <div className="max-w-[90rem] mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <CalcIcon className="h-8 w-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">
                  {isEditMode ? "Modifier l'offre" : "Calculateur de Mensualités iTakecare"}
                </h1>
              </div>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => navigateToPartner('dashboard')}
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
                      onOpenCatalog={() => setIsCatalogOpen(true)}
                      coefficient={coefficient}
                      monthlyPayment={monthlyPayment}
                      targetMonthlyPayment={targetMonthlyPayment}
                      setTargetMonthlyPayment={setTargetMonthlyPayment}
                      calculatedMargin={calculatedMargin}
                      applyCalculatedMargin={applyCalculatedMargin}
                      targetSalePrice={targetSalePrice}
                      setTargetSalePrice={setTargetSalePrice}
                      calculatedFromSalePrice={calculatedFromSalePrice}
                      applyCalculatedFromSalePrice={applyCalculatedFromSalePrice}
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
                    calculations={calculations}
                  />
                  
                  <ClientInfo
                    clientId={clientId}
                    clientName={clientName}
                    clientEmail={clientEmail}
                    clientCompany={clientCompany}
                    remarks={remarks}
                    setRemarks={setRemarks}
                    onOpenClientSelector={() => setIsClientSelectorOpen(true)}
                    handleSaveOffer={handleSaveOffer}
                    isSubmitting={isSubmitting}
                    selectedLeaser={selectedLeaser}
                    equipmentList={equipmentList}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <ProductSelector
          isOpen={isCatalogOpen}
          onClose={() => setIsCatalogOpen(false)}
          onSelectProduct={handleProductSelect}
          title="Ajouter un équipement"
          description="Sélectionnez un produit du catalogue à ajouter à votre offre"
        />

        <ClientSelector
          isOpen={isClientSelectorOpen}
          onClose={() => setIsClientSelectorOpen(false)}
          onSelectClient={handleClientSelect}
          selectedClientId={clientId}
          onClientSelect={() => {}}
        />
        
        <LeaserSelector
          isOpen={isLeaserSelectorOpen}
          onClose={() => setIsLeaserSelectorOpen(false)}
          onSelect={handleLeaserSelect}
          selectedLeaser={selectedLeaser}
        />
      </Container>
    </PageTransition>
  );
};

export default PartnerCreateOffer;
