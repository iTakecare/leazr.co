
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { Calculator as CalcIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Equipment, Leaser } from "@/types/equipment";
import { defaultLeasers } from "@/data/leasers";
import ProductCatalog from "@/components/ui/ProductCatalog";
import ClientSelector from "@/components/ui/ClientSelector";
import LeaserSelector from "@/components/ui/LeaserSelector";
import { createOffer } from "@/services/offerService";

// Import the new components
import EquipmentForm from "@/components/offer/EquipmentForm";
import MarginCalculator from "@/components/offer/MarginCalculator";
import EquipmentList from "@/components/offer/EquipmentList";
import ClientInfo from "@/components/offer/ClientInfo";
import LeaserButton from "@/components/offer/LeaserButton";
import { useEquipmentCalculator } from "@/hooks/useEquipmentCalculator";

const CreateOffer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [selectedLeaser, setSelectedLeaser] = useState<Leaser | null>(null);
  
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [remarks, setRemarks] = useState('');
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isClientSelectorOpen, setIsClientSelectorOpen] = useState(false);
  const [isLeaserSelectorOpen, setIsLeaserSelectorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Use the equipment calculator hook
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
    findCoefficient
  } = useEquipmentCalculator(selectedLeaser);

  useEffect(() => {
    setSelectedLeaser(defaultLeasers[0]);
    setLoading(false);
  }, []);

  const handleProductSelect = (product: any) => {
    if (!selectedLeaser) return;
    
    const coef = findCoefficient(product.price);
    const margin = 20; // Default margin as the product doesn't include monthly_price
    
    setEquipment({
      id: crypto.randomUUID(),
      title: `${product.name}`,
      purchasePrice: product.price,
      quantity: 1,
      margin: Number(margin),
    });
  };

  const handleClientSelect = (client: { id: string; name: string; email: string; company: string }) => {
    setClientId(client.id);
    setClientName(client.name);
    setClientEmail(client.email);
    setClientCompany(client.company);
  };

  const handleLeaserSelect = (leaser: Leaser) => {
    setSelectedLeaser(leaser);
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
      const equipmentDescription = equipmentList
        .map(eq => `${eq.title} (${eq.quantity}x)`)
        .join(", ");

      const offerData = {
        user_id: user.id,
        client_name: clientName,
        client_email: clientEmail,
        equipment_description: equipmentDescription,
        amount: globalMarginAdjustment.amount + equipmentList.reduce((sum, eq) => sum + (eq.purchasePrice * eq.quantity), 0),
        coefficient: globalMarginAdjustment.newCoef,
        monthly_payment: totalMonthlyPayment,
        commission: totalMonthlyPayment * 0.1, // Exemple: 10% de commission
      };

      const offerId = await createOffer(offerData);
      
      if (offerId) {
        toast.success("Offre créée avec succès !");
        navigate("/offers");
      } else {
        throw new Error("Failed to create offer");
      }
    } catch (error) {
      console.error("Error saving offer:", error);
      toast.error("Une erreur s'est produite lors de la création de l'offre");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <PageTransition>
      <Container>
        <div className="py-12 px-4">
          <div className="max-w-[90rem] mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <CalcIcon className="h-8 w-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">
                  Calculateur de Mensualités
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="grid gap-6">
                  {/* Leaser selector button */}
                  <LeaserButton 
                    selectedLeaser={selectedLeaser} 
                    onOpen={() => setIsLeaserSelectorOpen(true)} 
                  />
                  
                  {/* Equipment form */}
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
                  />

                  {/* Margin calculator */}
                  <MarginCalculator
                    targetMonthlyPayment={targetMonthlyPayment}
                    setTargetMonthlyPayment={setTargetMonthlyPayment}
                    calculatedMargin={calculatedMargin}
                    applyCalculatedMargin={applyCalculatedMargin}
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-8">
                {/* Equipment list */}
                <EquipmentList
                  equipmentList={equipmentList}
                  editingId={editingId}
                  startEditing={startEditing}
                  removeFromList={removeFromList}
                  updateQuantity={updateQuantity}
                  totalMonthlyPayment={totalMonthlyPayment}
                  globalMarginAdjustment={globalMarginAdjustment}
                />

                {equipmentList.length > 0 && (
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
                )}
              </div>
            </div>
          </div>
        </div>

        <ProductCatalog
          isOpen={isCatalogOpen}
          onClose={() => setIsCatalogOpen(false)}
          onSelectProduct={handleProductSelect}
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
          currentLeaserId={selectedLeaser?.id}
        />
      </Container>
    </PageTransition>
  );
};

export default CreateOffer;
