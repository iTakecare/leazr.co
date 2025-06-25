
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
import { Calculator as CalcIcon, Loader2, ArrowLeft } from "lucide-react";
import PageTransition from "@/components/layout/PageTransition";
import Container from "@/components/layout/Container";
import { calculateFinancedAmount } from "@/utils/calculator";
import { getCurrentUserCompanyId } from "@/services/multiTenantService";
import { OfferData } from "@/services/offers/types";
import { supabase } from "@/integrations/supabase/client";

import EquipmentForm from "@/components/offer/EquipmentForm";
import EquipmentList from "@/components/offer/EquipmentList";
import ClientInfo from "@/components/offer/ClientInfo";
import OfferConfiguration from "@/components/offer/OfferConfiguration";
import { useSimplifiedEquipmentCalculator } from "@/hooks/useSimplifiedEquipmentCalculator";
import { useOfferCommissionCalculator } from "@/hooks/useOfferCommissionCalculator";
import AmbassadorSelector, { AmbassadorSelectorAmbassador } from "@/components/ui/AmbassadorSelector";

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
  const [isInternalOffer, setIsInternalOffer] = useState(true);
  const [selectedAmbassador, setSelectedAmbassador] = useState<AmbassadorSelectorAmbassador | null>(null);
  
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isClientSelectorOpen, setIsClientSelectorOpen] = useState(false);
  const [isLeaserSelectorOpen, setIsLeaserSelectorOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [isAmbassadorSelectorOpen, setIsAmbassadorSelectorOpen] = useState(false);
  
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

  // Calcul de la marge totale depuis les équipements
  const totalEquipmentMargin = equipmentList.reduce((sum, eq) => {
    const equipmentMargin = (eq.purchasePrice * eq.quantity * eq.margin) / 100;
    return sum + equipmentMargin;
  }, 0);

  // Obtenir le commission_level_id depuis la structure commission_level
  const commissionLevelId = selectedAmbassador?.commission_level?.id;

  // Calcul de commission dynamique basé sur les paramètres
  const commissionData = useOfferCommissionCalculator({
    isInternalOffer,
    selectedAmbassadorId: selectedAmbassador?.id,
    commissionLevelId: commissionLevelId,
    totalMargin: totalEquipmentMargin,
    equipmentListLength: equipmentList.length,
    totalMonthlyPayment
  });

  console.log("🔍 CreateOffer - Commission Debug:", {
    isInternalOffer,
    selectedAmbassadorId: selectedAmbassador?.id,
    commissionLevelId: commissionLevelId,
    totalMargin: totalEquipmentMargin,
    equipmentListLength: equipmentList.length,
    totalMonthlyPayment,
    commissionData
  });

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
            console.log("🔄 Chargement de l'offre existante:", offer);
            
            // Charger les informations client
            setClientId(offer.client_id || null);
            setClientName(offer.client_name || '');
            setClientEmail(offer.client_email || '');
            setClientCompany(offer.clients?.company || '');
            setRemarks(offer.additional_info || '');
            
            // Déterminer le type d'offre et charger l'ambassadeur si nécessaire
            if (offer.type === 'internal_offer') {
              console.log("🏠 Offre interne détectée");
              setIsInternalOffer(true);
              setSelectedAmbassador(null);
            } else if (offer.ambassador_id) {
              console.log("👨‍💼 Offre ambassadeur détectée, ID:", offer.ambassador_id);
              setIsInternalOffer(false);
              
              // Charger les données de l'ambassadeur
              try {
                const { data: ambassadorData, error } = await supabase
                  .from('ambassadors')
                  .select(`
                    id,
                    name,
                    email,
                    commission_level_id
                  `)
                  .eq('id', offer.ambassador_id)
                  .single();

                if (error) {
                  console.error("Erreur lors du chargement de l'ambassadeur:", error);
                } else if (ambassadorData) {
                  console.log("✅ Ambassadeur chargé:", ambassadorData);
                  setSelectedAmbassador({
                    id: ambassadorData.id,
                    name: ambassadorData.name,
                    email: ambassadorData.email,
                    commission_level_id: ambassadorData.commission_level_id
                  });
                }
              } catch (error) {
                console.error("Erreur lors du chargement de l'ambassadeur:", error);
              }
            }

            // Identifier le leaser utilisé basé sur le coefficient
            if (offer.coefficient) {
              console.log("🔧 Coefficient détecté:", offer.coefficient);
              try {
                const fetchedLeasers = await getLeasers();
                
                // Trouver le leaser qui correspond au coefficient
                const matchingLeaser = fetchedLeasers.find(leaser => {
                  const ranges = leaser.ranges || [];
                  return ranges.some(range => Math.abs(range.coefficient - offer.coefficient) < 0.01);
                });
                
                if (matchingLeaser) {
                  console.log("✅ Leaser correspondant trouvé:", matchingLeaser.name);
                  setSelectedLeaser(matchingLeaser);
                } else {
                  console.log("⚠️ Aucun leaser correspondant au coefficient trouvé, utilisation du défaut");
                }
              } catch (error) {
                console.error("Erreur lors de la recherche du leaser:", error);
              }
            }
            
            // Charger et analyser les équipements
            if (offer.equipment_description) {
              try {
                const equipmentData = JSON.parse(offer.equipment_description);
                if (Array.isArray(equipmentData) && equipmentData.length > 0) {
                  console.log("📦 Données d'équipements JSON trouvées:", equipmentData);
                  
                  const formattedEquipment = equipmentData.map(item => ({
                    id: item.id || crypto.randomUUID(),
                    title: item.title,
                    purchasePrice: parseFloat(item.purchasePrice) || 0,
                    quantity: parseInt(item.quantity, 10) || 1,
                    margin: parseFloat(item.margin) || 20, // Préserver les marges individuelles
                    monthlyPayment: parseFloat(item.monthlyPayment) || 0,
                    attributes: item.attributes || {},
                    specifications: item.specifications || {}
                  }));
                  
                  console.log("✅ Équipements formatés avec marges préservées:", formattedEquipment);
                  setEquipmentList(formattedEquipment);
                  
                  // Charger le paiement mensuel cible
                  if (offer.monthly_payment) {
                    const monthlyPayment = typeof offer.monthly_payment === 'string' 
                      ? parseFloat(offer.monthly_payment) 
                      : offer.monthly_payment;
                    console.log("💰 Paiement mensuel cible défini:", monthlyPayment);
                    setTargetMonthlyPayment(monthlyPayment || 0);
                  }
                }
              } catch (e) {
                console.log("⚠️ Parsing des équipements en format string:", offer.equipment_description);
                
                // Fallback pour l'ancien format
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
                      margin: 20, // Marge par défaut pour l'ancien format
                      attributes: {},
                      specifications: {}
                    };
                  }
                  return null;
                }).filter(Boolean);
                
                if (equipmentItems.length > 0) {
                  console.log("📦 Équipements formatés depuis l'ancien format:", equipmentItems);
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

  const handleAmbassadorSelect = (ambassador: AmbassadorSelectorAmbassador) => {
    setSelectedAmbassador(ambassador);
    setIsAmbassadorSelectorOpen(false);
  };

  const handleInternalOfferChange = (value: boolean) => {
    setIsInternalOffer(value);
    
    // Si on passe en mode interne, réinitialiser l'ambassadeur et le client
    if (value) {
      setSelectedAmbassador(null);
      resetClientSelection();
    }
  };

  const resetClientSelection = () => {
    setClientId(null);
    setClientName('');
    setClientEmail('');
    setClientCompany('');
  };

  const handleAmbassadorChange = (ambassador: AmbassadorSelectorAmbassador) => {
    setSelectedAmbassador(ambassador);
    
    // Réinitialiser la sélection client quand on change d'ambassadeur
    resetClientSelection();
    
    setIsAmbassadorSelectorOpen(false);
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

    // Validation pour les offres ambassadeur
    if (!isInternalOffer && !selectedAmbassador) {
      toast.error("Veuillez sélectionner un ambassadeur pour les offres non-internes");
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
      console.log("💰 COMMISSION DEBUG - Commission calculée:", commissionData);
      
      // Ensure all numeric values are properly handled
      const totalAmount = globalMarginAdjustment.amount + 
        equipmentList.reduce((sum, eq) => sum + (eq.purchasePrice * eq.quantity), 0);
      
      // Calculate financed amount
      const currentCoefficient = coefficient || globalMarginAdjustment.newCoef || 3.27;
      const financedAmount = calculateFinancedAmount(totalMonthlyPayment, currentCoefficient);

      console.log("💰 MARGIN DEBUG - Saving margin data:", {
        totalEquipmentMargin,
        totalAmount,
        financedAmount,
        equipmentCount: equipmentList.length,
        globalMarginAdjustmentAmount: globalMarginAdjustment.amount,
        globalMarginDifference: globalMarginAdjustment.marginDifference
      });

      // Déterminer le type d'offre et l'ambassadeur
      const offerType = isInternalOffer ? 'internal_offer' : 'admin_offer';
      const ambassadorId = !isInternalOffer && selectedAmbassador ? selectedAmbassador.id : undefined;
      const calculatedCommission = commissionData.amount;

      console.log("💾 OFFRE - Type et commission:", {
        offerType,
        ambassadorId,
        ambassadorName: selectedAmbassador?.name,
        commissionLevelId: commissionLevelId,
        calculatedCommission,
        isInternalOffer
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
        commission: calculatedCommission, // Utiliser la commission calculée dynamiquement
        financed_amount: financedAmount,
        remarks: remarks,
        type: offerType,
        // S'assurer que workflow_status est toujours défini
        workflow_status: 'draft',
        // UTILISER DIRECTEMENT la marge calculée depuis les équipements
        margin: totalEquipmentMargin,
        margin_difference: globalMarginAdjustment.marginDifference || 0,
        total_margin_with_difference: totalEquipmentMargin + (globalMarginAdjustment.marginDifference || 0),
        // Assigner l'ambassadeur si ce n'est pas une offre interne
        ambassador_id: ambassadorId
      };

      console.log("💾 CRÉATION OFFRE - Données complètes:", offerData);
      console.log("💾 CRÉATION OFFRE - User ID:", user.id);
      console.log("💾 CRÉATION OFFRE - Company ID:", userCompanyId);
      console.log("💾 CRÉATION OFFRE - Type d'offre:", offerData.type);
      console.log("💾 CRÉATION OFFRE - Workflow Status:", offerData.workflow_status);
      console.log("💾 CRÉATION OFFRE - Marge totale FINALE:", offerData.margin);
      console.log("💾 CRÉATION OFFRE - Ambassador ID:", offerData.ambassador_id);
      console.log("💾 CRÉATION OFFRE - Commission FINALE:", offerData.commission);
      console.log("💾 CRÉATION OFFRE - Selected Ambassador:", selectedAmbassador?.name);

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
          console.log("✅ Marge sauvegardée:", result.data.margin);
          console.log("✅ Commission sauvegardée:", result.data.commission);
          console.log("✅ Type d'offre:", result.data.type);
          console.log("✅ Ambassador ID:", result.data.ambassador_id);
          console.log("✅ Workflow Status:", result.data.workflow_status);
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
      <div className="min-h-screen bg-background">
        <div className="h-screen flex flex-col">
          {/* Compact Header */}
          <div className="flex-shrink-0 border-b bg-background">
            <div className="px-4 lg:px-6 py-3">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CalcIcon className="h-5 w-5 text-primary" />
                    <h1 className="text-lg font-semibold text-gray-900">
                      {isEditMode ? "Modifier l'offre" : "Créer une offre"}
                      {/* Debug info pour la commission */}
                      {!isInternalOffer && commissionData.amount > 0 && (
                        <span className="ml-2 text-sm text-green-600">
                          (Commission: {commissionData.amount.toFixed(2)}€)
                        </span>
                      )}
                    </h1>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/offers')}
                    className="flex items-center gap-2 h-8 px-3"
                    size="sm"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Retour
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-auto">
            <div className="px-4 lg:px-6 py-4">
              <div className="max-w-7xl mx-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Chargement...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Configuration de l'offre */}
                    <OfferConfiguration
                      isInternalOffer={isInternalOffer}
                      setIsInternalOffer={handleInternalOfferChange}
                      selectedAmbassador={selectedAmbassador}
                      onOpenAmbassadorSelector={() => setIsAmbassadorSelectorOpen(true)}
                      selectedLeaser={selectedLeaser}
                      onOpenLeaserSelector={handleOpenLeaserSelector}
                    />

                    {/* Contenu principal */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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

                      <div className="xl:col-span-1 space-y-4">
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
                          // Transmettre les infos commission pour l'affichage
                          ambassadorId={selectedAmbassador?.id}
                          commissionLevelId={commissionLevelId}
                          hideFinancialDetails={isInternalOffer}
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
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
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
          selectedAmbassadorId={!isInternalOffer ? selectedAmbassador?.id : undefined}
        />
        
        <LeaserSelector
          isOpen={isLeaserSelectorOpen}
          onClose={() => setIsLeaserSelectorOpen(false)}
          onSelect={handleLeaserSelect}
          selectedLeaser={selectedLeaser}
        />

        <AmbassadorSelector
          isOpen={isAmbassadorSelectorOpen}
          onClose={() => setIsAmbassadorSelectorOpen(false)}
          onSelectAmbassador={handleAmbassadorChange}
          selectedAmbassadorId={selectedAmbassador?.id}
        />
      </div>
    </PageTransition>
  );
};

export default CreateOffer;
