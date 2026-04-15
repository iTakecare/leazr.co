import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Leaser } from "@/types/equipment";
import ProductSelector from "@/components/ui/product-selector/ProductSelector";
import ClientSelector, { ClientSelectorClient } from "@/components/ui/ClientSelector";
import LeaserSelector from "@/components/ui/LeaserSelector";
import { createOffer, getOfferById, updateOffer } from "@/services/offerService";
import { getLeasers } from "@/services/leaserService";
import { getClientById } from "@/services/clientService";
import { defaultLeasers } from "@/data/leasers";
import { Calculator as CalcIcon, Loader2, ArrowLeft, Package, AlertCircle } from "lucide-react";
import WaveLoader from "@/components/ui/WaveLoader";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import PackSelectorModal from "@/components/offers/PackSelectorModal";
import { ProductPack } from "@/types/pack";
import PageTransition from "@/components/layout/PageTransition";
import Container from "@/components/layout/Container";
import { calculateFinancedAmount } from "@/utils/calculator";
import { getMaxCoefficientFromLeaser } from "@/utils/leaserCalculator";
import { getCurrentUserCompanyId } from "@/services/multiTenantService";
import { OfferData } from "@/services/offers/types";
import { supabase } from "@/integrations/supabase/client";
import { calculateAnnualInsurance } from "@/utils/insuranceCalculator";
import EquipmentForm from "@/components/offer/EquipmentForm";
import DiscountInput, { DiscountData } from "@/components/offer/DiscountInput";
import EquipmentList from "@/components/offer/EquipmentList";
import ClientInfo from "@/components/offer/ClientInfo";
import OfferConfiguration from "@/components/offer/OfferConfiguration";
import DownPaymentCard from "@/components/offer/DownPaymentCard";
import { useSimplifiedEquipmentCalculator } from "@/hooks/useSimplifiedEquipmentCalculator";
import { useOfferCommissionCalculator } from "@/hooks/useOfferCommissionCalculator";
import AmbassadorSelector, { AmbassadorSelectorAmbassador } from "@/components/ui/AmbassadorSelector";
import { calculateEquipmentTotals, getFinancedAmount } from "@/utils/marginCalculations";
import { findCoefficientForAmount } from "@/utils/equipmentCalculations";
function useQuery() {
  return new URLSearchParams(useLocation().search);
}
const CreateOffer = () => {
  const {
    id: editId
  } = useParams();
  const navigate = useNavigate();
  const { navigateToAdmin } = useRoleNavigation();
  const {
    user
  } = useAuth();
  const query = useQuery();
  const clientIdParam = query.get("client");
  const offerIdParam = query.get("offerId") || query.get("id");
  
  // Priorité: URL parameter > query parameter pour l'ID d'édition
  const offerId = editId || offerIdParam;
  const [selectedLeaser, setSelectedLeaser] = useState<Leaser | null>(defaultLeasers[0]);
  const [selectedDuration, setSelectedDuration] = useState<number>(36);
  const [leasersLoaded, setLeasersLoaded] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [remarks, setRemarks] = useState('');
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [isInternalOffer, setIsInternalOffer] = useState(true);
  const [isSelfLeasing, setIsSelfLeasing] = useState(false);
  const [selectedAmbassador, setSelectedAmbassador] = useState<AmbassadorSelectorAmbassador | null>(null);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isClientSelectorOpen, setIsClientSelectorOpen] = useState(false);
  const [isLeaserSelectorOpen, setIsLeaserSelectorOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAmbassadorSelectorOpen, setIsAmbassadorSelectorOpen] = useState(false);
  const [loadedOfferData, setLoadedOfferData] = useState<any>(null);
  const [isPackSelectorOpen, setIsPackSelectorOpen] = useState(false);
  const [fileFeeEnabled, setFileFeeEnabled] = useState(true);
  const [fileFeeAmount, setFileFeeAmount] = useState(75);
  const [productsToBeDetermined, setProductsToBeDetermined] = useState(false);
  const [estimatedBudget, setEstimatedBudget] = useState<number>(0);
  const [isPurchase, setIsPurchase] = useState(false); // Mode achat direct
  const [downPayment, setDownPayment] = useState(0); // Acompte
  const [globalDiscount, setGlobalDiscount] = useState<DiscountData>({
    enabled: false,
    type: 'percentage',
    value: 0,
    discountAmount: 0,
    monthlyPaymentBeforeDiscount: 0,
    monthlyPaymentAfterDiscount: 0,
  });
  const [selectedPacks, setSelectedPacks] = useState<Array<{
    pack_id: string;
    pack: ProductPack;
    quantity: number;
    unit_monthly_price: number;
  }>>([]);
  const {
    equipment,
    setEquipment,
    monthlyPayment,
    targetMonthlyPayment,
    setTargetMonthlyPayment,
    targetSalePrice,
    setTargetSalePrice,
    coefficient,
    calculatedMargin,
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
  } = useSimplifiedEquipmentCalculator(selectedLeaser, selectedDuration);

  // Calcul de la marge totale depuis les équipements
  const totalEquipmentMargin = equipmentList.reduce((sum, eq) => {
    const equipmentMargin = eq.purchasePrice * eq.quantity * eq.margin / 100;
    return sum + equipmentMargin;
  }, 0);

  // Obtenir le commission_level_id depuis la structure commission_level
  const commissionLevelId = selectedAmbassador?.commission_level?.id;

  // Calcul du prix d'achat total
  const totalPurchaseAmount = calculations?.totalPurchasePrice || 0;

  // Calcul de commission dynamique basé sur les paramètres
  const commissionData = useOfferCommissionCalculator({
    isInternalOffer,
    selectedAmbassadorId: selectedAmbassador?.id,
    commissionLevelId: commissionLevelId,
    totalMargin: totalEquipmentMargin,
    equipmentList: equipmentList.map(e => ({ 
      product_id: e.productId, 
      title: e.title, 
      quantity: e.quantity,
      category_id: e.categoryId
    })),
    totalMonthlyPayment,
    totalPurchaseAmount
  });
  
  // Calcul de l'assurance annuelle (tenir compte de la remise)
  const effectiveMonthlyForInsurance = globalDiscount.enabled && globalDiscount.discountAmount > 0
    ? totalMonthlyPayment - globalDiscount.discountAmount
    : totalMonthlyPayment;
  const annualInsurance = calculateAnnualInsurance(effectiveMonthlyForInsurance, selectedDuration);
  console.log("🔍 CreateOffer - Commission Debug:", {
    isInternalOffer,
    selectedAmbassadorId: selectedAmbassador?.id,
    commissionLevelId: commissionLevelId,
    totalMargin: totalEquipmentMargin,
    equipmentListLength: equipmentList.length,
    totalMonthlyPayment,
    commissionData
  });

  // ÉTAPE 1: Charger les leasers en premier
  useEffect(() => {
    const fetchLeasers = async () => {
      try {
        console.log("🔧 STEP 1: Loading leasers...");
        const fetchedLeasers = await getLeasers();
        if (fetchedLeasers && fetchedLeasers.length > 0) {
          console.log("✅ STEP 1: Leasers loaded:", fetchedLeasers.length);
          setSelectedLeaser(fetchedLeasers[0]);
        } else {
          console.log("⚠️ STEP 1: No leasers found, using default");
        }
      } catch (error) {
        console.error("❌ STEP 1: Error fetching leasers:", error);
        toast.error("Impossible de charger les prestataires de leasing. Utilisation des données par défaut.");
      } finally {
        setLeasersLoaded(true);
        console.log("🏁 STEP 1: Leasers loading completed");
      }
    };
    fetchLeasers();
  }, []);

  // ÉTAPE 2: Charger le client depuis les paramètres (si présent)
  useEffect(() => {
    const loadClientFromParam = async () => {
      if (clientIdParam && leasersLoaded) {
        try {
          console.log("🔧 STEP 2: Loading client from param:", clientIdParam);
          setLoading(true);
          const client = await getClientById(clientIdParam);
          if (client) {
            setClientId(client.id);
            setClientName(client.name);
            setClientEmail(client.email || "");
            setClientCompany(client.company || "");
            console.log("✅ STEP 2: Client loaded:", client.name);
          }
        } catch (error) {
          console.error("❌ STEP 2: Error loading client:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    loadClientFromParam();
  }, [clientIdParam, leasersLoaded]);

  // ÉTAPE 3: Charger les données d'offre (seulement après que les leasers soient chargés)
  useEffect(() => {
    const loadOfferData = async () => {
      if (offerId && leasersLoaded) {
        try {
          console.log("🔧 STEP 3: Loading offer data for ID:", offerId);
          setLoading(true);
          setIsEditMode(true);
          const offer = await getOfferById(offerId);
          if (offer) {
            console.log("🔄 STEP 3: Offer data loaded:", offer);
            
            // Store offer data for financial summary
            setLoadedOfferData(offer);

            // Charger les informations client
            setClientId(offer.client_id || null);
            setClientName(offer.client_name || '');
            setClientEmail(offer.client_email || '');
            setClientCompany(offer.clients?.company || '');
            setRemarks(offer.additional_info || '');

            // Déterminer le type d'offre et charger l'ambassadeur si nécessaire
            if (offer.type === 'self_leasing') {
              console.log("🏢 STEP 3: Self-leasing offer detected");
              setIsSelfLeasing(true);
              setIsInternalOffer(true);
              setSelectedAmbassador(null);
            } else if (offer.type === 'client_request' && !offer.ambassador_id) {
              console.log("🏠 STEP 3: Internal/Client request offer detected");
              setIsSelfLeasing(false);
              setIsInternalOffer(true);
              setSelectedAmbassador(null);
            } else if (offer.type === 'internal_offer') {
              // Rétrocompatibilité avec anciennes offres internes
              console.log("🏠 STEP 3: Legacy internal offer detected");
              setIsSelfLeasing(false);
              setIsInternalOffer(true);
              setSelectedAmbassador(null);
            } else if (offer.ambassador_id) {
              console.log("👨‍💼 STEP 3: Ambassador offer detected, ID:", offer.ambassador_id);
              setIsSelfLeasing(false);
              setIsInternalOffer(false);

              // Charger les données de l'ambassadeur
              try {
                const {
                  data: ambassadorData,
                  error
                } = await supabase.from('ambassadors').select(`
                    id,
                    name,
                    email,
                    commission_level_id,
                    commission_levels (
                      id,
                      name
                    )
                  `).eq('id', offer.ambassador_id).single();
                if (error) {
                  console.error("❌ STEP 3: Error loading ambassador:", error);
                } else if (ambassadorData) {
                  console.log("✅ STEP 3: Ambassador loaded:", ambassadorData);
                  setSelectedAmbassador({
                    id: ambassadorData.id,
                    name: ambassadorData.name,
                    email: ambassadorData.email,
                    commission_level_id: ambassadorData.commission_level_id,
                    commission_level: ambassadorData.commission_levels ? {
                      id: ambassadorData.commission_levels.id,
                      name: ambassadorData.commission_levels.name
                    } : undefined
                  });
                }
              } catch (error) {
                console.error("❌ STEP 3: Error loading ambassador:", error);
              }
            }

            // Charger le mode achat direct
            setIsPurchase(offer.is_purchase || false);
            console.log("💰 STEP 3: Mode achat:", offer.is_purchase);

            // Charger le leaser sauvegardé dans l'offre (seulement en mode leasing)
            if (!offer.is_purchase) {
              try {
                const fetchedLeasers = await getLeasers();

                // PRIORITÉ 1: Utiliser le leaser_id stocké dans l'offre
                if (offer.leaser_id) {
                  console.log("🔧 STEP 3: Finding leaser by ID:", offer.leaser_id);
                  const matchingLeaser = fetchedLeasers.find(leaser => leaser.id === offer.leaser_id);

                  if (matchingLeaser) {
                    console.log("✅ STEP 3: Leaser found by ID:", matchingLeaser.name);
                    setSelectedLeaser(matchingLeaser);

                    // Vérifier si c'est du self-leasing basé sur le leaser
                    if ((matchingLeaser as any).is_own_company === true) {
                      console.log("🏢 STEP 3: Leaser is own company, activating self-leasing");
                      setIsSelfLeasing(true);
                    }
                  } else {
                    console.warn("⚠️ STEP 3: Leaser ID not found in leasers list, falling back to coefficient");
                    // Fallback: chercher par coefficient si le leaser_id n'est pas trouvé
                    if (offer.coefficient) {
                      const coefficientMatch = fetchedLeasers.find(leaser => {
                        const ranges = leaser.ranges || [];
                        return ranges.some(range => Math.abs(range.coefficient - offer.coefficient) < 0.01);
                      });
                      if (coefficientMatch) {
                        console.log("✅ STEP 3: Fallback leaser found by coefficient:", coefficientMatch.name);
                        setSelectedLeaser(coefficientMatch);
                      }
                    }
                  }
                } else if (offer.coefficient) {
                  // FALLBACK: Si pas de leaser_id, utiliser l'ancien comportement par coefficient
                  console.log("🔧 STEP 3: No leaser_id, falling back to coefficient:", offer.coefficient);
                  const matchingLeaser = fetchedLeasers.find(leaser => {
                    const ranges = leaser.ranges || [];
                    return ranges.some(range => Math.abs(range.coefficient - offer.coefficient) < 0.01);
                  });
                  if (matchingLeaser) {
                    console.log("✅ STEP 3: Matching leaser found by coefficient:", matchingLeaser.name);
                    setSelectedLeaser(matchingLeaser);

                    if ((matchingLeaser as any).is_own_company === true && offer.type !== 'self_leasing') {
                      console.log("🏢 STEP 3: Leaser is own company, activating self-leasing");
                      setIsSelfLeasing(true);
                    }
                  } else {
                    console.log("⚠️ STEP 3: No matching leaser found for coefficient");
                  }
                }

                // Charger la durée APRÈS le leaser (même batch React)
                if (offer.duration) {
                  setSelectedDuration(offer.duration);
                  console.log("🕐 STEP 3: Duration loaded:", offer.duration);
                }
              } catch (error) {
                console.error("❌ STEP 3: Error finding leaser:", error);
              }
            }

            // ÉTAPE 3a: Charger et analyser les équipements - CRITIQUE
            if (offer.equipment_description) {
              try {
                const equipmentData = JSON.parse(offer.equipment_description);
                if (Array.isArray(equipmentData) && equipmentData.length > 0) {
                  console.log("📦 STEP 3a: Processing equipment data:", equipmentData);
                  const formattedEquipment = equipmentData.map(item => ({
                    id: item.id || crypto.randomUUID(),
                    title: item.title,
                    purchasePrice: parseFloat(item.purchasePrice) || 0,
                    quantity: parseInt(item.quantity, 10) || 1,
                    margin: parseFloat(item.margin) || 20,
                    monthlyPayment: parseFloat(item.monthlyPayment) || 0,
                    attributes: item.attributes || {},
                    specifications: item.specifications || {},
                    productId: item.productId,
                    categoryId: item.categoryId
                  }));
                  console.log("✅ STEP 3a: Equipment formatted:", formattedEquipment);

                  // ATTENDRE UN PEU pour que le hook soit prêt
                  setTimeout(() => {
                    console.log("⏰ STEP 3a: Setting equipment list after delay");
                    setEquipmentList(formattedEquipment);

                    // Charger le paiement mensuel cible
                    if (offer.monthly_payment) {
                      const monthlyPayment = typeof offer.monthly_payment === 'string' ? parseFloat(offer.monthly_payment) : offer.monthly_payment;
                      console.log("💰 STEP 3a: Setting target monthly payment:", monthlyPayment);
                      setTargetMonthlyPayment(monthlyPayment || 0);
                    }
                  }, 500); // Délai de 500ms pour laisser le hook s'initialiser
                }
              } catch (e) {
                console.log("⚠️ STEP 3a: Parsing equipment as string fallback");
                const equipmentItems = offer.equipment_description.split(',').map(item => {
                  const match = item.trim().match(/(.+) \((\d+)x\)/);
                  if (match) {
                    const title = match[1].trim();
                    const quantity = parseInt(match[2], 10);
                    const totalCost = typeof offer.amount === 'string' ? parseFloat(offer.amount) : offer.amount || 0;
                    const approxPricePerItem = totalCost / (quantity || 1);
                    return {
                      id: crypto.randomUUID(),
                      title,
                      purchasePrice: approxPricePerItem,
                      quantity,
                      margin: 20,
                      attributes: {},
                      specifications: {}
                    };
                  }
                  return null;
                }).filter(Boolean);
                if (equipmentItems.length > 0) {
                  console.log("📦 STEP 3a: Fallback equipment formatted:", equipmentItems);
                  setTimeout(() => {
                    setEquipmentList(equipmentItems);
                    const monthlyPayment = typeof offer.monthly_payment === 'string' ? parseFloat(offer.monthly_payment) : offer.monthly_payment || 0;
                    setTargetMonthlyPayment(monthlyPayment);
                  }, 500);
                }
              }
            }
            
            // Charger l'acompte si présent
            if (offer.down_payment !== undefined && offer.down_payment !== null) {
              console.log("💰 STEP 3: Loading down payment:", offer.down_payment);
              setDownPayment(parseFloat(offer.down_payment) || 0);
            }

            // Charger la remise commerciale si présente
            if (offer.discount_amount && offer.discount_amount > 0) {
              console.log("🏷️ STEP 3: Loading commercial discount:", {
                type: offer.discount_type,
                value: offer.discount_value,
                amount: offer.discount_amount,
                beforeDiscount: offer.monthly_payment_before_discount
              });
              setGlobalDiscount({
                enabled: true,
                type: offer.discount_type || 'percentage',
                value: offer.discount_value || 0,
                discountAmount: offer.discount_amount,
                monthlyPaymentBeforeDiscount: offer.monthly_payment_before_discount || 0,
                monthlyPaymentAfterDiscount: (offer.monthly_payment_before_discount || 0) - offer.discount_amount,
              });
            }
            
            console.log("🏁 STEP 3: Offer loading completed successfully");
            toast.success("Offre chargée avec succès");
          } else {
            toast.error("Impossible de trouver cette offre");
            navigateToAdmin("offers");
          }
        } catch (error) {
          console.error("❌ STEP 3: Error loading offer:", error);
          toast.error("Erreur lors du chargement de l'offre");
        } finally {
          setLoading(false);
        }
      }
    };
    loadOfferData();
  }, [offerId, leasersLoaded, navigate, setEquipmentList, setTargetMonthlyPayment]);

  // Garantir que la durée de l'offre chargée est toujours appliquée
  useEffect(() => {
    if (loadedOfferData && !loadedOfferData.is_purchase && loadedOfferData.duration) {
      console.log("🕐 DURATION EFFECT: Applying duration from loaded offer:", loadedOfferData.duration);
      setSelectedDuration(loadedOfferData.duration);
    }
  }, [loadedOfferData]);

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
      productId: product.id,
      categoryId: product.category_id
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
    
    // Si le leaser est un bailleur de leasing en propre, définir automatiquement le type self_leasing
    if ((leaser as any).is_own_company === true) {
      setIsSelfLeasing(true);
      toast.info("Leasing en propre détecté - Type d'offre défini sur 'Location propre'");
      console.log("🏢 Self-leasing activé pour le leaser:", leaser.name);
    } else {
      setIsSelfLeasing(false);
    }
  };

  const handleDurationChange = (duration: number) => {
    setSelectedDuration(duration);
    console.log("🕐 Duration changed:", duration);
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

  const handlePackSelect = (pack: ProductPack, quantity: number) => {
    console.log("📦 Pack sélectionné:", pack.name, "Quantité:", quantity);
    
    // Vérifier que le pack contient des produits
    if (!pack.items || pack.items.length === 0) {
      toast.error("Ce pack ne contient aucun produit");
      return;
    }

    // Créer tous les équipements du pack en une seule fois
    const newEquipments = pack.items
      .filter(packItem => packItem.product) // Filtrer les items valides
      .map(packItem => ({
        id: crypto.randomUUID(),
        title: packItem.product!.name,
        quantity: packItem.quantity * quantity,
        purchasePrice: packItem.unit_purchase_price,
        monthlyPayment: packItem.unit_monthly_price,
        margin: packItem.margin_percentage,
        attributes: {},
        specifications: {
          description: packItem.product!.description || "",
          category: packItem.product!.category?.name || packItem.product!.category_name || ""
        }
      }));

    // Ajouter tous les équipements en une seule fois
    setEquipmentList(prev => [...prev, ...newEquipments]);
    
    toast.success(`${newEquipments.length} produit(s) ajouté(s) depuis le pack "${pack.name}"`);
    setIsPackSelectorOpen(false);
  };

  const handlePackRemove = (packId: string) => {
    setSelectedPacks(prev => prev.filter(p => p.pack_id !== packId));
  };
  const handleSaveOffer = async () => {
    if (!user) {
      toast.error("Vous devez être connecté pour créer une offre");
      return;
    }
    // Validation
    if (!productsToBeDetermined && equipmentList.length === 0) {
      toast.error("Veuillez ajouter au moins un équipement");
      return;
    }

    if (productsToBeDetermined && estimatedBudget <= 0) {
      toast.error("Veuillez saisir un budget estimé");
      return;
    }

    if (!clientName) {
      toast.error("Veuillez sélectionner ou créer un client");
      return;
    }

    // Validation pour les offres ambassadeur
    if (!isInternalOffer && !selectedAmbassador) {
      toast.error("Veuillez sélectionner un ambassadeur pour les offres non-internes");
      return;
    }
    setIsSubmitting(true);
    try {
      // Récupérer le company_id - en mode édition, utiliser celui de l'offre existante
      let userCompanyId;
      if (isEditMode && loadedOfferData?.company_id) {
        userCompanyId = loadedOfferData.company_id;
        console.log("💾 MODE ÉDITION - Utilisation du company_id existant:", userCompanyId);
      } else {
        try {
          userCompanyId = await getCurrentUserCompanyId();
          console.log("💾 CRÉATION OFFRE - Company ID récupéré:", userCompanyId);
        } catch (error) {
          console.error("❌ Erreur lors de la récupération du company_id:", error);
          toast.error("Impossible de récupérer l'ID de l'entreprise");
          return;
        }
      }
      if (!userCompanyId) {
        console.error("❌ Company ID manquant");
        toast.error("ID de l'entreprise manquant");
        return;
      }

      // Préparer les données d'équipement avec les attributs et spécifications
      // IMPORTANT: En mode achat, forcer monthlyPayment à 0 et calculer sellingPrice proportionnellement
      // MODE ACHAT: Utiliser les mêmes totaux que le leasing (priorité aux totaux)
      const totalPurchaseForDistribution = calculations?.totalPurchasePrice || equipmentList.reduce((sum, eq) => 
        sum + (eq.purchasePrice * eq.quantity), 0);
      const totalFinancedForDistribution = calculations?.totalFinancedAmount || 0;
      
      const equipmentData = equipmentList.map(eq => {
        // MODE ACHAT: Forcer mensualité à 0 et calculer sellingPrice proportionnellement
        if (isPurchase) {
          // Répartition proportionnelle du montant financé total sur chaque ligne
          const linePA = eq.purchasePrice * eq.quantity;
          const proportionalTotalSelling = totalPurchaseForDistribution > 0 
            ? (linePA / totalPurchaseForDistribution) * totalFinancedForDistribution 
            : linePA;
          const sellingPriceUnit = proportionalTotalSelling / eq.quantity;
          
          console.log(`💾 SAVE ACHAT - ${eq.title}: PA=${eq.purchasePrice}, qty=${eq.quantity}, PV proportionnel unitaire=${sellingPriceUnit}`);
          return {
            id: eq.id,
            title: eq.title,
            purchasePrice: eq.purchasePrice,
            quantity: eq.quantity,
            margin: eq.margin,
            monthlyPayment: 0, // Toujours 0 en achat
            sellingPrice: sellingPriceUnit, // PV unitaire proportionnel pour persistance
            attributes: eq.attributes || {},
            specifications: eq.specifications || {}
          };
        }
        
        // MODE LEASING: Préserver le monthlyPayment s'il existe (venant du catalogue)
        // Sinon, calculer à partir du prix d'achat + marge + coefficient
        let finalMonthlyPayment = eq.monthlyPayment;
        
        // Seulement recalculer si pas de monthlyPayment existant ou si c'est 0
        if (!eq.monthlyPayment || eq.monthlyPayment <= 0) {
          const financedAmountForEquipment = eq.purchasePrice * eq.quantity * (1 + eq.margin / 100);
          const coeff = findCoefficientForAmount(financedAmountForEquipment, selectedLeaser, selectedDuration);
          finalMonthlyPayment = (financedAmountForEquipment * coeff) / 100;
        }
        
        console.log(`💾 SAVE LEASING - ${eq.title}: stored=${eq.monthlyPayment}, final=${finalMonthlyPayment}`);
        
        return {
          id: eq.id,
          title: eq.title,
          purchasePrice: eq.purchasePrice,
          quantity: eq.quantity,
          margin: eq.margin,
          monthlyPayment: finalMonthlyPayment,
          attributes: eq.attributes || {},
          specifications: eq.specifications || {}
        };
      });
      console.log("💾 Saving equipment data with attributes:", equipmentData);
      console.log("💰 COMMISSION DEBUG - Commission calculée:", commissionData);

      // Ensure all numeric values are properly handled
      const totalAmount = globalMarginAdjustment.amount + equipmentList.reduce((sum, eq) => sum + eq.purchasePrice * eq.quantity, 0);

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

      // CORRECTION: Déterminer le type d'offre et l'ambassadeur correctement
      let offerType: string;
      let ambassadorId: string | undefined;
      
      // Priorité 1: Self-leasing (leasing en propre)
      if (isSelfLeasing) {
        offerType = 'self_leasing';
        ambassadorId = undefined;
        console.log("🏢 LOCATION PROPRE détectée");
      } else if (isInternalOffer) {
        offerType = 'client_request';
        ambassadorId = undefined;
        console.log("🏠 DEMANDE CLIENT (interne) détectée");
      } else if (selectedAmbassador) {
        offerType = 'ambassador_offer'; // Sera vérifié/corrigé dans createOffer
        ambassadorId = selectedAmbassador.id;
        console.log("👨‍💼 OFFRE AMBASSADEUR détectée:", {
          ambassadorId,
          ambassadorName: selectedAmbassador.name
        });
      } else {
        offerType = 'admin_offer';
        ambassadorId = undefined;
        console.log("⚙️ OFFRE ADMINISTRATIVE détectée");
      }
      const calculatedCommission = commissionData.amount;
      console.log("💾 OFFRE - Type et commission:", {
        offerType,
        ambassadorId,
        ambassadorName: selectedAmbassador?.name,
        commissionLevelId: commissionLevelId,
        calculatedCommission,
        isInternalOffer
      });
      // MODE ACHAT: Utiliser les mêmes totaux que le mode leasing (priorité aux totaux)
      // Le prix de vente total en achat DOIT être égal au montant financé du leasing
      const totalPurchaseAmountForSave = calculations?.totalPurchasePrice || equipmentList.reduce((sum, eq) => 
        sum + (eq.purchasePrice * eq.quantity), 0);
      
      // En mode achat, utiliser les totaux du leasing (calculations) et non PA × (1 + margin%)
      const totalSaleAmountForPurchase = calculations?.totalFinancedAmount || 0;
      const totalMarginForPurchase = calculations?.normalMarginAmount || 0;

      const offerData: OfferData = {
        user_id: user.id,
        company_id: userCompanyId,
        client_name: clientName,
        client_email: clientEmail || null,
        client_id: clientId,
        
        // Mode achat direct
        is_purchase: isPurchase,
        
        // Gestion "produits à déterminer"
        products_to_be_determined: productsToBeDetermined,
        estimated_budget: productsToBeDetermined ? estimatedBudget : null,
        equipment_description: productsToBeDetermined ? '[]' : JSON.stringify(equipmentData),
        
        // Montants adaptés selon le mode (achat vs leasing)
        // ACHAT: amount = total achat, financed_amount = total vente (= montant financé leasing), margin = marge leasing
        amount: productsToBeDetermined 
          ? (estimatedBudget || 0) 
          : isPurchase 
            ? totalPurchaseAmountForSave  // En achat: montant d'achat total
            : (totalAmount || 0),
        coefficient: isPurchase ? 0 : (productsToBeDetermined ? (getMaxCoefficientFromLeaser(selectedLeaser) || 3.55) : (Number(globalMarginAdjustment.newCoef) || 3.55)),
        monthly_payment: isPurchase 
          ? 0 
          : productsToBeDetermined 
            ? ((estimatedBudget || 0) * getMaxCoefficientFromLeaser(selectedLeaser)) / 100
            : globalDiscount.enabled && globalDiscount.discountAmount
              ? (totalMonthlyPayment || 0) - globalDiscount.discountAmount
              : (totalMonthlyPayment || 0),
        commission: calculatedCommission || 0,
        financed_amount: isPurchase 
          ? totalSaleAmountForPurchase
          : productsToBeDetermined 
            ? (estimatedBudget || 0) 
            : globalDiscount.enabled && globalDiscount.discountAmount
              ? (((totalMonthlyPayment || 0) - globalDiscount.discountAmount) * 100) / (Number(globalMarginAdjustment.newCoef) || 3.55)
              : (financedAmount || 0),
        remarks: remarks,
        type: offerType,
        // En mode édition, ne jamais toucher au workflow_status ; en création, mettre 'draft'
        ...(isEditMode ? {} : { workflow_status: 'draft' }),
        margin: productsToBeDetermined ? 0 : (isPurchase ? totalMarginForPurchase : totalEquipmentMargin),
        margin_difference: globalMarginAdjustment.marginDifference || 0,
        total_margin_with_difference: productsToBeDetermined ? 0 : (totalEquipmentMargin + (globalMarginAdjustment.marginDifference || 0)),
        ambassador_id: ambassadorId,
        // En mode achat, pas de leaser ni durée
        leaser_id: isPurchase ? null : selectedLeaser?.id,
        duration: isPurchase ? null : selectedDuration,
        file_fee: isPurchase ? 0 : (fileFeeEnabled ? fileFeeAmount : 0),
        annual_insurance: isPurchase ? 0 : (productsToBeDetermined ? 0 : annualInsurance),
        down_payment: isPurchase ? 0 : downPayment,
        // Remise commerciale
        discount_type: globalDiscount.enabled ? globalDiscount.type : null,
        discount_value: globalDiscount.enabled ? globalDiscount.value : null,
        discount_amount: globalDiscount.enabled ? globalDiscount.discountAmount : null,
        monthly_payment_before_discount: globalDiscount.enabled ? globalDiscount.monthlyPaymentBeforeDiscount : null,
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
        // updateOffer retourne directement les données (array), pas {data: ...}
        if (result && ((Array.isArray(result) && result.length > 0) || (!Array.isArray(result) && typeof result === 'object'))) {
          console.log("✅ OFFRE MISE À JOUR avec succès:", result);
          toast.success("Offre mise à jour avec succès !");
        } else {
          const errMsg = "Échec de la mise à jour de l'offre";
          console.error("❌ ÉCHEC MISE À JOUR OFFRE - Aucune donnée retournée:", result);
          toast.error(errMsg);
          throw new Error(errMsg);
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
        navigateToAdmin("offers");
      }, 1000);
    } catch (error) {
      console.error("❌ ERREUR lors de l'enregistrement de l'offre:", error);
      toast.error(`Une erreur s'est produite lors de l'enregistrement de l'offre: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  // Wizard step state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = productsToBeDetermined ? 2 : 3;

  const canAdvanceStep1 = !!(selectedLeaser || isPurchase);
  const canAdvanceStep2 = productsToBeDetermined
    ? estimatedBudget > 0
    : equipmentList.length > 0;

  const goNext = () => {
    if (currentStep === 1) {
      setCurrentStep(productsToBeDetermined ? (totalSteps) : 2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const goBack = () => {
    if (currentStep === 2) setCurrentStep(1);
    else if (currentStep === 3) setCurrentStep(productsToBeDetermined ? 1 : 2);
  };

  // Recalculate totalSteps when productsToBeDetermined changes
  const effectiveTotalSteps = productsToBeDetermined ? 2 : 3;
  const effectiveStep = productsToBeDetermined && currentStep === 3 ? 2 : currentStep;

  const steps = productsToBeDetermined
    ? [{ label: "Configuration" }, { label: "Validation" }]
    : [{ label: "Configuration" }, { label: "Équipements" }, { label: "Validation" }];

  return <PageTransition>
      <div className="min-h-screen bg-background">
        <div className="h-screen flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 border-b bg-background">
            <div className="px-4 lg:px-6 py-3">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CalcIcon className="h-5 w-5 text-primary" />
                    <h1 className="text-base font-semibold text-gray-900">
                      {isEditMode ? "Modifier l'offre" : "Nouvelle demande"}
                    </h1>
                  </div>

                  {/* Step indicator */}
                  {!isEditMode && (
                    <div className="flex items-center gap-1.5">
                      {steps.map((step, idx) => {
                        const stepNum = idx + 1;
                        const realStep = productsToBeDetermined && currentStep === 3 ? 2 : currentStep;
                        const isCompleted = stepNum < realStep;
                        const isCurrent = stepNum === realStep;
                        return (
                          <React.Fragment key={stepNum}>
                            {idx > 0 && (
                              <div className={`h-px w-8 transition-colors ${isCompleted ? 'bg-emerald-500' : 'bg-border'}`} />
                            )}
                            <div className={`flex items-center gap-1.5 ${isCurrent || isCompleted ? 'cursor-default' : 'cursor-default'}`}>
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium border"
                                style={isCompleted
                                  ? { backgroundColor: '#10b981', borderColor: '#10b981', color: '#fff' }
                                  : isCurrent
                                  ? { backgroundColor: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
                                  : { backgroundColor: '#f3f4f6', borderColor: '#d1d5db', color: '#374151' }
                                }
                              >
                                {isCompleted ? '✓' : stepNum}
                              </div>
                              <span
                                className="text-xs hidden sm:block"
                                style={{ color: isCurrent ? 'inherit' : '#6b7280', fontWeight: isCurrent ? 600 : 400 }}
                              >
                                {step.label}
                              </span>
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}

                  <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2 h-8 px-3" size="sm">
                    <ArrowLeft className="h-3 w-3" />
                    Annuler
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
                    <WaveLoader message="Chargement..." />
                  </div>
                ) : (
                  <div className="space-y-4">

                    {/* ─── ÉTAPE 1 : Configuration ─── */}
                    {(currentStep === 1 || isEditMode) && (
                      <div className="space-y-4">
                        {!isEditMode && (
                          <div className="text-sm font-medium text-muted-foreground">
                            Étape 1 — Configurez le type, le financement et sélectionnez le client
                          </div>
                        )}

                        <OfferConfiguration
                          isInternalOffer={isInternalOffer}
                          setIsInternalOffer={handleInternalOfferChange}
                          selectedAmbassador={selectedAmbassador}
                          onOpenAmbassadorSelector={() => setIsAmbassadorSelectorOpen(true)}
                          selectedLeaser={selectedLeaser}
                          onOpenLeaserSelector={handleOpenLeaserSelector}
                          selectedDuration={selectedDuration}
                          onDurationChange={handleDurationChange}
                          fileFeeEnabled={fileFeeEnabled}
                          fileFeeAmount={fileFeeAmount}
                          onFileFeeEnabledChange={setFileFeeEnabled}
                          onFileFeeAmountChange={setFileFeeAmount}
                          isPurchase={isPurchase}
                          setIsPurchase={setIsPurchase}
                        />

                        {/* Client selector inline */}
                        <Card className="p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Client</span>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => setIsClientSelectorOpen(true)}
                            className="w-full"
                          >
                            {clientId ? "Modifier le client" : "Sélectionner un client"}
                          </Button>
                          {clientName && (
                            <div className="mt-3 p-3 bg-muted/40 rounded-lg text-sm">
                              <div className="font-medium">{clientName}</div>
                              {clientCompany && <div className="text-muted-foreground text-xs mt-0.5">{clientCompany}</div>}
                              {clientEmail && <div className="text-muted-foreground text-xs">{clientEmail}</div>}
                            </div>
                          )}
                        </Card>

                        {/* Option Produits à déterminer */}
                        <Card className="p-4">
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              id="products-tbd-simple"
                              checked={productsToBeDetermined}
                              onCheckedChange={(checked) => {
                                setProductsToBeDetermined(checked as boolean);
                                if (checked) setEquipmentList([]);
                              }}
                            />
                            <div className="flex-1">
                              <Label htmlFor="products-tbd-simple" className="text-sm font-medium cursor-pointer">
                                Produits à déterminer
                              </Label>
                              <p className="text-xs text-muted-foreground mt-1">
                                Créer une demande sans définir les produits pour scorer le client d'abord
                              </p>
                            </div>
                          </div>
                          {productsToBeDetermined && (
                            <div className="mt-4">
                              <Label htmlFor="estimated-budget">Budget estimé (€)</Label>
                              <Input
                                id="estimated-budget"
                                type="number"
                                value={estimatedBudget}
                                onChange={(e) => setEstimatedBudget(Number(e.target.value))}
                                placeholder="Ex: 5000"
                                min="0"
                                className="mt-1"
                              />
                            </div>
                          )}
                        </Card>

                        {/* Nav step 1 */}
                        {!isEditMode && (
                          <div className="flex justify-end pt-2">
                            <Button
                              onClick={goNext}
                              disabled={!canAdvanceStep1}
                              className="bg-primary hover:bg-primary/90"
                            >
                              {productsToBeDetermined ? "Valider →" : "Équipements →"}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ─── ÉTAPE 2 : Équipements ─── */}
                    {(currentStep === 2 || isEditMode) && !productsToBeDetermined && (
                      <div className="space-y-4">
                        {!isEditMode && (
                          <div className="text-sm font-medium text-muted-foreground">
                            Étape 2 — Ajoutez les équipements à financer
                          </div>
                        )}

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
                              targetSalePrice={targetSalePrice}
                              setTargetSalePrice={setTargetSalePrice}
                              calculatedFromSalePrice={calculatedFromSalePrice}
                              applyCalculatedFromSalePrice={applyCalculatedFromSalePrice}
                              clientId={clientId}
                              isPurchase={isPurchase}
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
                              ambassadorId={selectedAmbassador?.id}
                              commissionLevelId={commissionLevelId}
                              hideFinancialDetails={false}
                              fileFee={fileFeeEnabled ? fileFeeAmount : 0}
                              annualInsurance={annualInsurance}
                              isPurchase={isPurchase}
                              discountData={globalDiscount}
                            />

                            {equipmentList.length > 0 && !isPurchase && (
                              <DiscountInput
                                monthlyPayment={totalMonthlyPayment}
                                margin={totalEquipmentMargin}
                                coefficient={Number(coefficient) || Number(globalMarginAdjustment.newCoef) || 0}
                                totalPurchasePrice={calculations?.totalPurchasePrice || 0}
                                discountData={globalDiscount}
                                onDiscountChange={setGlobalDiscount}
                                showMarginImpact={true}
                                label="Remise commerciale"
                              />
                            )}

                            {!isPurchase && equipmentList.length > 0 && (
                              <DownPaymentCard
                                downPayment={downPayment}
                                onDownPaymentChange={setDownPayment}
                                totalSellingPrice={calculations?.totalFinancedAmount || 0}
                                coefficient={globalMarginAdjustment.newCoef || coefficient || 3.27}
                                disabled={productsToBeDetermined}
                              />
                            )}
                          </div>
                        </div>

                        {/* Nav step 2 */}
                        {!isEditMode && (
                          <div className="flex justify-between pt-2">
                            <Button variant="outline" onClick={goBack}>
                              ← Configuration
                            </Button>
                            <Button
                              onClick={goNext}
                              disabled={!canAdvanceStep2}
                              className="bg-primary hover:bg-primary/90"
                            >
                              Valider →
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ─── ÉTAPE 3 : Validation ─── */}
                    {(currentStep === 3 || isEditMode) && (
                      <div className="space-y-4">
                        {!isEditMode && (
                          <div className="text-sm font-medium text-muted-foreground">
                            {productsToBeDetermined ? "Étape 2" : "Étape 3"} — Vérifiez et enregistrez
                          </div>
                        )}

                        {productsToBeDetermined && (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Produits à déterminer</AlertTitle>
                            <AlertDescription>
                              Budget estimé : <strong>{estimatedBudget.toLocaleString('fr-FR')} €</strong>
                              <br />
                              Les produits seront définis après scoring du client.
                            </AlertDescription>
                          </Alert>
                        )}

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
                          productsToBeDetermined={productsToBeDetermined}
                        />

                        {/* Nav step 3 */}
                        {!isEditMode && (
                          <div className="flex justify-start pt-2">
                            <Button variant="outline" onClick={goBack}>
                              ← {productsToBeDetermined ? "Configuration" : "Équipements"}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

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
          onOpenPackSelector={() => setIsPackSelectorOpen(true)}
          title="Ajouter un équipement"
          description="Sélectionnez un produit du catalogue à ajouter à votre offre"
        />

        <PackSelectorModal
          isOpen={isPackSelectorOpen}
          onClose={() => setIsPackSelectorOpen(false)}
          selectedPacks={selectedPacks}
          onPackSelect={handlePackSelect}
          onPackRemove={handlePackRemove}
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
    </PageTransition>;
};
export default CreateOffer;