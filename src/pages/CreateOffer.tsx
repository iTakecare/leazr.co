import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Equipment, Leaser } from "@/types/equipment";
import PageTransition from "@/components/layout/PageTransition";
import Container from "@/components/layout/Container";
import { FolderPlus, Save, FileText, Calculator, X } from "lucide-react";
import ProductCatalog from "@/components/ui/ProductCatalog";
import LeaserSelector from "@/components/ui/LeaserSelector";
import ClientSelector from "@/components/ui/ClientSelector";

import EquipmentForm from "@/components/offer/EquipmentForm";
import EquipmentList from "@/components/offer/EquipmentList";
import FormActionButtons from "@/components/offer/FormActionButtons";
import LeaserButton from "@/components/offer/LeaserButton";
import MarginCalculator from "@/components/offer/MarginCalculator";
import PriceDetailsDisplay from "@/components/offer/PriceDetailsDisplay";
import ClientInfo from "@/components/offer/ClientInfo";

import { useEquipmentCalculator } from "@/hooks/useEquipmentCalculator";
import { createOffer } from "@/services/offerService";
import { getLeasers } from "@/services/leaserService";
import { getClientById } from "@/services/clientService";
import { defaultLeasers } from "@/data/leasers";

const CreateOffer = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [leasers, setLeasers] = useState<Leaser[]>([]);
  const [selectedLeaser, setSelectedLeaser] = useState<Leaser | null>(null);
  const [isLeaserSelectorOpen, setIsLeaserSelectorOpen] = useState(false);
  
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientId, setClientId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');
  
  const [step, setStep] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isClientSelectorOpen, setIsClientSelectorOpen] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    equipment,
    setEquipment,
    equipmentList,
    setEquipmentList,
    editingId,
    totalMonthlyPayment,
    globalMarginAdjustment,
    addToList,
    startEditing,
    cancelEditing,
    saveEditing,
    removeFromList,
    updateQuantity,
    updateMargin,
    toggleAdaptMonthlyPayment
  } = useEquipmentCalculator(selectedLeaser);

  // Create a properly typed globalMarginAdjustment object for EquipmentList
  const typedGlobalMarginAdjustment = {
    enabled: globalMarginAdjustment.enabled || false,
    amount: globalMarginAdjustment.amount || 0,
    originalAmount: globalMarginAdjustment.originalAmount || 0,
    newCoef: globalMarginAdjustment.newCoef || 0,
    originalCoef: globalMarginAdjustment.originalCoef || 0,
    newMonthly: globalMarginAdjustment.newMonthly || 0,
    originalMonthly: globalMarginAdjustment.originalMonthly || 0
  };

  useEffect(() => {
    const fetchLeasers = async () => {
      try {
        const fetchedLeasers = await getLeasers();
        setLeasers(fetchedLeasers);
        
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

  const handleLeaserSelect = (leaser: Leaser) => {
    setSelectedLeaser(leaser);
    setIsLeaserSelectorOpen(false);
  };

  const handleProductSelect = (product: any) => {
    if (!selectedLeaser) return;
    
    setEquipment({
      id: crypto.randomUUID(),
      title: product.name,
      purchasePrice: product.price || 0,
      quantity: 1,
      margin: 20,
    });
    
    addToList();
  };

  const handleClientSelect = (client: { id: string; name: string; email: string; company: string }) => {
    setClientId(client.id);
    setClientName(client.name);
    setClientEmail(client.email);
    setClientCompany(client.company);
  };

  const handleSaveOffer = async () => {
    if (!user) {
      toast.error("Vous devez être connecté pour enregistrer une offre");
      return;
    }

    if (!clientName || !clientEmail || !selectedLeaser || equipmentList.length === 0) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare equipment data
      const equipmentData = equipmentList.map(eq => ({
        id: eq.id,
        title: eq.title,
        purchasePrice: eq.purchasePrice,
        quantity: eq.quantity,
        margin: eq.margin,
      }));
      
      // Text format for backward compatibility
      const equipmentDescription = equipmentList
        .map(eq => `${eq.title} (${eq.quantity}x)`)
        .join(", ");

      const offerData = {
        clientId: clientId,
        client_name: clientName,
        client_email: clientEmail,
        leaser_id: selectedLeaser.id,
        equipment_description: JSON.stringify(equipmentData),
        equipment_text: equipmentDescription,
        monthly_payment: totalMonthlyPayment,
        additional_info: remarks,
        user_id: user.id
      };

      const result = await createOffer(offerData);
      
      if (result) {
        toast.success("Offre créée avec succès !");
        navigate("/offers");
      } else {
        throw new Error("Failed to create offer");
      }
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
        <div className="py-12 px-4 lg:px-8">
          <div className="max-w-[90rem] mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <FolderPlus className="h-8 w-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">
                  Créer une nouvelle offre
                </h1>
              </div>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => navigate('/offers')}
                >
                  Annuler
                </Button>
                <Button onClick={handleSaveOffer} disabled={isSubmitting || equipmentList.length === 0}>
                  {isSubmitting ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <Card className="shadow-sm border-gray-200 rounded-lg mb-6">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-lg font-medium">Ajouter un équipement</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <Button
                      onClick={() => setIsCatalogOpen(true)}
                      className="w-full"
                    >
                      Parcourir le catalogue
                    </Button>
                  </CardContent>
                </Card>

                <EquipmentList
                  equipmentList={equipmentList}
                  editingId={editingId}
                  startEditing={startEditing}
                  removeFromList={removeFromList}
                  updateQuantity={updateQuantity}
                  totalMonthlyPayment={totalMonthlyPayment}
                  globalMarginAdjustment={typedGlobalMarginAdjustment}
                  toggleAdaptMonthlyPayment={toggleAdaptMonthlyPayment}
                />
              </div>

              <div className="space-y-8">
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

                <Card className="shadow-sm border-gray-200 rounded-lg">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-lg font-medium">Prestataire de leasing</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <LeaserButton
                      selectedLeaser={selectedLeaser}
                      onOpenLeaserSelector={() => setIsLeaserSelectorOpen(true)}
                    />
                  </CardContent>
                </Card>
              </div>
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

          <LeaserSelector
            isOpen={isLeaserSelectorOpen}
            onClose={() => setIsLeaserSelectorOpen(false)}
            onSelectLeaser={handleLeaserSelect}
            leasers={leasers}
          />

          <ClientSelector
            isOpen={isClientSelectorOpen}
            onClose={() => setIsClientSelectorOpen(false)}
            onSelectClient={handleClientSelect}
          />
        </div>
      </Container>
    </PageTransition>
  );
};

export default CreateOffer;
