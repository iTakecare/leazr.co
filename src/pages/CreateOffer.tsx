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
import { createOffer, getOfferById, updateOffer } from "@/services/offerService";
import { getLeasers } from "@/services/leaserService";
import { getClientById } from "@/services/clientService";
import { defaultLeasers } from "@/data/leasers";

import EquipmentForm from "@/components/offer/EquipmentForm";
import EquipmentList from "@/components/offer/EquipmentList";
import ClientInfo from "@/components/offer/ClientInfo";
import LeaserButton from "@/components/offer/LeaserButton";
import { useEquipmentCalculator } from "@/hooks/useEquipmentCalculator";

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
            
            if (offer.coefficient && offer.amount) {
              const coefficient = parseFloat(String(offer.coefficient)) || 0;
              const amount = parseFloat(String(offer.amount)) || 0;
              const monthlyPayment = parseFloat(String(offer.monthly_payment)) || 0;
              
              setGlobalMarginAdjustment(prev => ({
                ...prev,
                amount: amount,
                newCoef: coefficient,
                newMonthly: monthlyPayment
              }));
            }
            
            if (offer.equipment_description) {
              try {
                const equipmentData = JSON.parse(offer.equipment_description);
                if (Array.isArray(equipmentData) && equipmentData.length > 0) {
                  console.log("Found JSON equipment data:", equipmentData);
                  const formattedEquipment = equipmentData.map(item => ({
                    id: item.id || crypto.randomUUID(),
                    title: item.title,
                    purchasePrice: parseFloat(String(item.purchasePrice)) || 0,
                    quantity: parseInt(String(item.quantity), 10) || 1,
                    margin: parseFloat(String(item.margin)) || 20,
                    monthlyPayment: parseFloat(String(item.monthlyPayment || 0))
                  }));
                  
                  console.log("Formatted equipment with preserved margins:", formattedEquipment);
                  setEquipmentList(formattedEquipment);
                  
                  if (offer.monthly_payment) {
                    setTargetMonthlyPayment(parseFloat(String(offer.monthly_payment)) || 0);
                  }
                }
              } catch (e) {
                console.log("Parsing equipment_description as string format:", offer.equipment_description);
                const equipmentItems = offer.equipment_description.split(',').map(item => {
                  const match = item.trim().match(/(.+) \((\d+)x\)/);
                  if (match) {
                    const title = match[1].trim();
                    const quantity = parseInt(match[2], 10);
                    
                    const totalCost = offer.amount || 0;
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
                  setTargetMonthlyPayment(parseFloat(offer.monthly_payment) || 0);
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
  }, [offerId, navigate, setEquipmentList, setGlobalMarginAdjustment, setTargetMonthlyPayment]);

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

      const offerData = {
        user_id: user.id,
        client_name: clientName,
        client_email: clientEmail,
        client_id: clientId,
        equipment_description: JSON.stringify(equipmentData),
        equipment_text: equipmentDescription,
        amount: globalMarginAdjustment.amount + equipmentList.reduce((sum, eq) => sum + (eq.purchasePrice * eq.quantity), 0),
        coefficient: globalMarginAdjustment.newCoef,
        monthly_payment: totalMonthlyPayment,
        commission: totalMonthlyPayment * 0.1,
        additional_info: remarks
      };

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
      
      navigate("/offers");
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

        <ProductCatalog
          isOpen={isCatalogOpen}
          onClose={() => setIsCatalogOpen(false)}
          onSelectProduct={handleProductSelect}
          isSheet={true}
          title="Ajouter un équipement"
          description="Sélectionnez un produit du catalogue à ajouter à votre offre"
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

export default CreateOffer;
