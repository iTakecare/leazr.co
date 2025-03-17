
import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { Calculator as CalcIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Leaser } from "@/types/equipment";
import ProductCatalog from "@/components/ui/ProductCatalog";
import ClientSelector from "@/components/ui/ClientSelector";
import LeaserSelector from "@/components/ui/LeaserSelector";
import { getClientById } from "@/services/clientService";
import { getLeasers } from "@/services/leaserService";
import { getPartnerById } from "@/services/partnerService";
import { getAmbassadorById } from "@/services/ambassadorService";
import { getCommissionLevelWithRates } from "@/services/commissionService";
import { defaultLeasers } from "@/data/leasers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import EquipmentForm from "@/components/offer/EquipmentForm";
import EquipmentList from "@/components/offer/EquipmentList";
import ClientInfo from "@/components/offer/ClientInfo";
import LeaserButton from "@/components/offer/LeaserButton";
import { useEquipmentCalculator } from "@/hooks/useEquipmentCalculator";
import { calculateCommissionByLevel } from "@/utils/calculator";
import { formatCurrency } from "@/utils/formatters";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const CommissionCalculator = () => {
  const { id, type } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const query = useQuery();
  const clientIdParam = query.get("client");
  
  const [selectedLeaser, setSelectedLeaser] = useState<Leaser | null>(defaultLeasers[0]);
  
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [remarks, setRemarks] = useState('');
  const [clientId, setClientId] = useState<string | null>(null);
  
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isClientSelectorOpen, setIsClientSelectorOpen] = useState(false);
  const [isLeaserSelectorOpen, setIsLeaserSelectorOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Commission info
  const [commissionInfo, setCommissionInfo] = useState({
    levelName: "",
    commissionAmount: 0,
    levelId: "",
    isLoading: false
  });
  
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
    
    if (id && type) {
      fetchUserInfo(id, type);
    }
  }, [id, type]);

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
    // Calculate commission when monthly payment changes
    calculateCommission();
  }, [totalMonthlyPayment, commissionInfo.levelId]);

  const fetchUserInfo = async (userId: string, userType: string) => {
    setLoading(true);
    setCommissionInfo(prev => ({ ...prev, isLoading: true }));
    
    try {
      let userData;
      if (userType === "partner") {
        userData = await getPartnerById(userId);
      } else if (userType === "ambassador") {
        userData = await getAmbassadorById(userId);
      }
      
      if (userData && userData.commission_level_id) {
        const levelData = await getCommissionLevelWithRates(userData.commission_level_id);
        
        setCommissionInfo({
          levelName: levelData?.name || "Barème inconnu",
          commissionAmount: 0, // Will be calculated when totalMonthlyPayment changes
          levelId: userData.commission_level_id,
          isLoading: false
        });
      } else {
        setCommissionInfo({
          levelName: "Aucun barème défini",
          commissionAmount: 0,
          levelId: "",
          isLoading: false
        });
      }
    } catch (error) {
      console.error(`Error loading ${userType} data:`, error);
      toast.error(`Erreur lors du chargement des données du ${userType === "partner" ? "partenaire" : "ambassadeur"}`);
      setCommissionInfo(prev => ({ ...prev, isLoading: false }));
    } finally {
      setLoading(false);
    }
  };

  const calculateCommission = async () => {
    if (!commissionInfo.levelId || totalMonthlyPayment <= 0) {
      setCommissionInfo(prev => ({ ...prev, commissionAmount: 0 }));
      return;
    }
    
    try {
      setCommissionInfo(prev => ({ ...prev, isLoading: true }));
      
      // Calculate totalAmount from equipmentList
      const totalAmount = equipmentList.reduce((sum, eq) => 
        sum + (eq.purchasePrice * eq.quantity), 0);
      
      // Use utility function to calculate commission
      const { amount } = await calculateCommissionByLevel(totalAmount, commissionInfo.levelId);
      
      setCommissionInfo(prev => ({
        ...prev,
        commissionAmount: amount,
        isLoading: false
      }));
    } catch (error) {
      console.error("Error calculating commission:", error);
      setCommissionInfo(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleProductSelect = (product: any) => {
    if (!selectedLeaser) return;
    
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
  };

  const handleClientSelect = (client: { id: string; name: string; email: string; company: string }) => {
    setClientId(client.id);
    setClientName(client.name);
    setClientEmail(client.email);
    setClientCompany(client.company);
  };

  const handleLeaserSelect = (leaser: Leaser) => {
    setSelectedLeaser(leaser);
    setIsLeaserSelectorOpen(false);
  };

  const handleOpenLeaserSelector = () => {
    setIsLeaserSelectorOpen(true);
  };

  const getBackRoute = () => {
    if (type === "partner") {
      return `/partners/${id}`;
    } else if (type === "ambassador") {
      return `/ambassadors/${id}`;
    }
    return "/dashboard";
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
                  Calculateur de Mensualités iTakecare
                </h1>
              </div>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => navigate(getBackRoute())}
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
                  <LeaserButton
                    selectedLeaser={selectedLeaser}
                    onOpen={handleOpenLeaserSelector}
                  />

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
                    globalMarginAdjustment={globalMarginAdjustment}
                    toggleAdaptMonthlyPayment={toggleAdaptMonthlyPayment}
                    adaptMonthlySwitchLabel="Adapter la mensualité au montant financé (argument commercial)"
                  />
                  
                  {/* Commission information card */}
                  <Card className="shadow-sm">
                    <CardContent className="pt-6">
                      <h3 className="text-lg font-medium mb-4">Informations de commission</h3>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                          <span className="text-muted-foreground">Barème :</span>
                          <div className="flex items-center">
                            {commissionInfo.isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <span className="font-medium flex items-center">
                                {commissionInfo.levelName}
                                {commissionInfo.levelName === "Aucun barème défini" && (
                                  <Badge variant="outline" className="ml-2 text-amber-600 bg-amber-50">Non défini</Badge>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center pt-2">
                          <span className="text-muted-foreground">Montant de la commission :</span>
                          <div className="flex items-center">
                            {commissionInfo.isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <span className="font-medium text-green-600">
                                {formatCurrency(commissionInfo.commissionAmount)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <ClientInfo
                    clientId={clientId}
                    clientName={clientName}
                    clientEmail={clientEmail}
                    clientCompany={clientCompany}
                    remarks={remarks}
                    setRemarks={setRemarks}
                    onOpenClientSelector={() => setIsClientSelectorOpen(true)}
                    handleSaveOffer={() => {}} // No save action in calculator
                    isSubmitting={isSubmitting}
                    selectedLeaser={selectedLeaser}
                    equipmentList={equipmentList}
                    hideSubmitButton={true} // Hide the submit button in calculator mode
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <ProductCatalog
          isOpen={isCatalogOpen}
          onClose={() => setIsCatalogOpen(false)}
          onSelectProduct={handleProductSelect}
          isSheet={true}
          title="Ajouter un équipement"
          description="Sélectionnez un produit du catalogue à ajouter à votre calcul"
        />

        <ClientSelector
          isOpen={isClientSelectorOpen}
          onClose={() => setIsClientSelectorOpen(false)}
          onSelectClient={handleClientSelect}
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

export default CommissionCalculator;
