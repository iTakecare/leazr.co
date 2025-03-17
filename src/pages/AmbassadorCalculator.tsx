
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { Calculator as CalcIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Leaser } from "@/types/equipment";
import ProductCatalog from "@/components/ui/ProductCatalog";
import ClientSelector from "@/components/ui/ClientSelector";
import { createAmbassadorOffer } from "@/services/ambassadorService";
import { getLeasers } from "@/services/leaserService";
import { getClientById } from "@/services/clientService";
import { defaultLeasers } from "@/data/leasers";

import EquipmentList from "@/components/offer/EquipmentList";
import ClientInfo from "@/components/offer/ClientInfo";
import { useEquipmentCalculator } from "@/hooks/useEquipmentCalculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AmbassadorCalculator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [selectedLeaser, setSelectedLeaser] = useState<Leaser | null>(defaultLeasers[0]);
  
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [remarks, setRemarks] = useState('');
  const [clientId, setClientId] = useState<string | null>(null);
  
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isClientSelectorOpen, setIsClientSelectorOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    equipment,
    setEquipment,
    equipmentList,
    setEquipmentList,
    totalMonthlyPayment,
    globalMarginAdjustment,
    editingId,
    addToList,
    startEditing,
    cancelEditing,
    removeFromList,
    updateQuantity,
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
    if (!user || !user.ambassador_id) {
      toast.error("Vous devez être connecté en tant qu'ambassadeur pour créer une offre");
      return;
    }

    if (!clientName || !clientEmail || equipmentList.length === 0) {
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
        ambassadorId: user.ambassador_id,
        client_name: clientName,
        client_email: clientEmail,
        client_id: clientId,
        equipment_description: JSON.stringify(equipmentData),
        equipment_text: equipmentDescription,
        monthly_payment: totalMonthlyPayment,
        commission: 0, // Will be calculated based on commission plan
        additional_info: remarks
      };

      const result = await createAmbassadorOffer(offerData);
      
      if (result) {
        toast.success("Offre créée avec succès !");
        navigate("/ambassador/dashboard");
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
        <div className="py-12 px-4">
          <div className="max-w-[90rem] mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <CalcIcon className="h-8 w-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">
                  Calculateur d'offre Ambassadeur
                </h1>
              </div>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => navigate('/ambassador/dashboard')}
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
                    globalMarginAdjustment={globalMarginAdjustment}
                    toggleAdaptMonthlyPayment={toggleAdaptMonthlyPayment}
                    hideMarginInfo={true}
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
      </Container>
    </PageTransition>
  );
};

export default AmbassadorCalculator;
