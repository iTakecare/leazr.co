import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
import { getCurrentUserCompanyId } from "@/services/multiTenantService";
import { OfferData } from "@/services/offers/types";

import EquipmentForm from "@/components/offer/EquipmentForm";
import EquipmentList from "@/components/offer/EquipmentList";
import ClientInfo from "@/components/offer/ClientInfo";
import LeaserButton from "@/components/offer/LeaserButton";
import { useSimplifiedEquipmentCalculator } from "@/hooks/useSimplifiedEquipmentCalculator";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const CreateOffer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
            navigate("/offers");
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
  }, [offerId, navigate, setEquipmentList, setTargetMonthlyPayment]);

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
      // Récupérer le company_id avant de créer l'offre
      let userCompanyId;
      try {
        userCompanyId = await getCurrentUserCompanyId();
        console.log("💾 CRÉATION OFFRE - Company ID récupéré:", userCompanyId);
      } catch (error) {
        console.error("❌ Erreur lors de la récupération du company_id:", error);
        toast.error("Impossible de récupérer l'ID de l'entreprise");
        return;
      }

      if (!userCompanyId) {
        console.error("❌ Company ID manquant");
        toast.error("ID de l'entreprise manquant");
        return;
      }

      // Préparer les données d'équipement avec les attributs et spécifications
      const equipmentData = equipmentList.map(eq => ({
        id: eq.id,
        title: eq.title,
        purchasePrice: eq.purchasePrice,
        quantity: eq.quantity,
        margin: eq.margin,
        monthlyPayment: eq.monthlyPayment || totalMonthlyPayment / equipmentList.length,
        // S'assurer que les attributs et spécifications sont inclus avec des valeurs par défaut
        attributes: eq.attributes || {},
        specifications: eq.specifications || {}
      }));
      
      console.log("💾 Saving equipment data with attributes:", equipmentData);
      
      // Ensure all numeric values are properly handled
      const totalAmount = globalMarginAdjustment.amount + 
        equipmentList.reduce((sum, eq) => sum + (eq.purchasePrice * eq.quantity), 0);
      
      // Calculate financed amount
      const currentCoefficient = coefficient || globalMarginAdjustment.newCoef || 3.27;
      const financedAmount = calculateFinancedAmount(totalMonthlyPayment, currentCoefficient);

      // Calculer la marge totale des équipements
      const totalEquipmentMargin = equipmentList.reduce((sum, eq) => {
        const equipmentMargin = (eq.purchasePrice * eq.quantity * eq.margin) / 100;
        return sum + equipmentMargin;
      }, 0);
      
      console.log("💰 MARGE CALCULÉE depuis les équipements:", totalEquipmentMargin);

      // Calculer la différence de marge
      const totalMarginWithDifference = globalMarginAdjustment.marginDifference || 0;
      
      console.log("💰 MARGIN DEBUG - Saving margin data:", {
        globalMarginAdjustment,
        marginDifference: globalMarginAdjustment.marginDifference,
        totalMarginWithDifference,
        totalAmount,
        financedAmount,
        calculatedMargin: totalAmount - financedAmount,
        totalEquipmentMargin
      });

      const offerData: OfferData = {
        user_id: user.id,
        company_id: userCompanyId, // Champ obligatoire
        client_name: clientName,
        client_email: clientEmail,
        client_id: clientId,
        equipment_description: JSON.stringify(equipmentData),
        amount: totalAmount,
        coefficient: globalMarginAdjustment.newCoef,
        monthly_payment: totalMonthlyPayment,
        commission: totalMonthlyPayment * 0.1,
        financed_amount: financedAmount,
        remarks: remarks,
        type: 'admin_offer',
        // Utiliser la marge calculée depuis les équipements si disponible
        margin: totalEquipmentMargin > 0 ? totalEquipmentMargin : totalMarginWithDifference,
        margin_difference: globalMarginAdjustment.marginDifference || 0,
        total_margin_with_difference: totalMarginWithDifference
      };

      console.log("💾 CRÉATION OFFRE - Données complètes:", offerData);
      console.log("💾 CRÉATION OFFRE - User ID:", user.id);
      console.log("💾 CRÉATION OFFRE - Company ID:", userCompanyId);
      console.log("💾 CRÉATION OFFRE - Type d'offre:", offerData.type);
      console.log("💾 CRÉATION OFFRE - Marge totale:", offerData.margin);

      let result;
      
      if (isEditMode && offerId) {
        result = await updateOffer(offerId, offerData);
        if (result) {
          console.log("✅ OFFRE MISE À JOUR avec succès:", result);
          toast.success("Offre mise à jour avec succès !");
        } else {
          throw new Error("Failed to update offer");
        }
      } else {
        result = await createOffer(offerData);
        if (result && result.data) {
          console.log("✅ OFFRE CRÉÉE avec succès:", result.data);
          console.log("✅ ID de l'offre créée:", result.data.id);
          toast.success("Offre créée avec succès !");
        } else {
          console.error("❌ ERREUR - Pas de données retournées:", result);
          if (result && result.error) {
            console.error("❌ Détails de l'erreur:", result.error);
            throw new Error(`Failed to create offer: ${result.error.message || 'Unknown error'}`);
          } else {
            throw new Error("Failed to create offer - no data returned");
          }
        }
      }
      
      // Attendre un peu avant de rediriger pour s'assurer que l'offre est bien enregistrée
      setTimeout(() => {
        navigate("/offers");
      }, 1000);
      
    } catch (error) {
      console.error("❌ ERREUR lors de l'enregistrement de l'offre:", error);
      toast.error(`Une erreur s'est produite lors de l'enregistrement de l'offre: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background flex w-full">
        <div className="flex-1 overflow-auto">
          <div className="py-8 px-20">
            <div className="max-w-full mx-auto">
              <div className="flex justify-between items-center mb-8 px-2">
                <div className="flex items-center gap-3">
                  <CalcIcon className="h-8 w-8 text-blue-600" />
                  <h1 className="text-2xl font-bold text-gray-900">
                    {isEditMode ? "Modifier l'offre" : "Calculateur de Mensualités iTakecare"}
                  </h1>
                </div>
                <div className="flex gap-4">
                  <LeaserButton 
                    selectedLeaser={selectedLeaser} 
                    onOpen={handleOpenLeaserSelector}
                  />
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
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 px-2">
                  <div className="xl:col-span-1">
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
        </div>
      </div>
    </PageTransition>
  );
};

export default CreateOffer;
