
import React, { useState, useEffect } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import ClientInfo from "@/components/offer/ClientInfo";
import EquipmentForm from "@/components/offer/EquipmentForm";
import EquipmentList from "@/components/offer/EquipmentList";
import { Equipment, Leaser, GlobalMarginAdjustment } from "@/types/equipment";
import PageTransition from "@/components/layout/PageTransition";
import Container from "@/components/layout/Container";
import { useAuth } from "@/context/AuthContext";
import { v4 as uuidv4 } from "uuid";
import { useEquipmentCalculator } from "@/hooks/useEquipmentCalculator";
import { defaultLeasers } from "@/data/leasers";
import { Calculator as CalcIcon, Loader2 } from "lucide-react";

// Version du calculateur adaptée pour les ambassadeurs
const AmbassadorCreateOffer = () => {
  const location = useLocation();
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Nous utilisons le hook useEquipmentCalculator pour une cohérence parfaite avec CreateOffer
  const [selectedLeaser, setSelectedLeaser] = useState<Leaser | null>(defaultLeasers[0]);
  
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
  
  // Si clientId est présent, charger les informations du client
  useEffect(() => {
    if (clientId) {
      fetchClient(clientId);
    }
  }, [clientId]);
  
  const fetchClient = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      setClient(data);
    } catch (error) {
      console.error("Erreur lors du chargement du client:", error);
      toast.error("Impossible de charger les informations du client");
    } finally {
      setLoading(false);
    }
  };
  
  // Pour l'ouverture du sélecteur de client (adaptation pour ClientInfo)
  const handleOpenClientSelector = () => {
    // Fonctionnalité à implémenter si nécessaire
    toast.info("La sélection de client n'est pas disponible dans cette version");
  };
  
  // Pour l'ouverture du catalogue (adaptation pour EquipmentForm)
  const handleOpenCatalog = () => {
    // Fonctionnalité à implémenter si nécessaire
  };
  
  const handleSaveOffer = async () => {
    if (!client) {
      toast.error("Veuillez d'abord sélectionner un client");
      return;
    }
    
    if (equipmentList.length === 0) {
      toast.error("Veuillez ajouter au moins un équipement");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Calculer le montant total
      const totalMonthlyPayment = equipmentList.reduce(
        (sum, item) => sum + ((item.monthlyPayment || 0) * item.quantity),
        0
      );
      
      const totalPurchasePrice = equipmentList.reduce(
        (sum, item) => sum + (item.purchasePrice * item.quantity),
        0
      );
      
      // Décrire l'équipement
      const equipmentDescription = JSON.stringify(
        equipmentList.map(eq => ({
          id: eq.id,
          title: eq.title,
          purchasePrice: eq.purchasePrice,
          quantity: eq.quantity,
          margin: eq.margin,
          monthlyPayment: eq.monthlyPayment || totalMonthlyPayment / equipmentList.length
        }))
      );
      
      const equipmentText = equipmentList
        .map((item) => `${item.title} (${item.quantity}x)`)
        .join(", ");
      
      // Créer l'offre dans la base de données
      const { data, error } = await supabase.from("offers").insert([
        {
          client_id: client.id,
          client_name: client.name,
          client_email: client.email,
          equipment_description: equipmentDescription,
          equipment_text: equipmentText,
          amount: globalMarginAdjustment.amount + equipmentList.reduce((sum, eq) => sum + (eq.purchasePrice * eq.quantity), 0),
          coefficient: globalMarginAdjustment.newCoef,
          monthly_payment: totalMonthlyPayment,
          commission: totalMonthlyPayment * 0.1,
          workflow_status: "draft",
          type: "ambassador_offer",
          user_id: user?.id,
        }
      ]).select();
      
      if (error) throw error;
      
      toast.success("Offre créée avec succès!");
      
      // Rediriger vers la page des offres
      navigate("/ambassador/offers");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de l'offre:", error);
      toast.error("Impossible de sauvegarder l'offre");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Préparation des props pour le composant ClientInfo
  const clientInfoProps = {
    clientId: client?.id || null,
    clientName: client?.name || "",
    clientEmail: client?.email || "",
    clientCompany: client?.company || "",
    remarks: "",
    setRemarks: () => {}, // No-op pour cette version simplifiée
    onOpenClientSelector: handleOpenClientSelector,
    handleSaveOffer: handleSaveOffer,
    isSubmitting: isSubmitting,
    selectedLeaser: selectedLeaser,
    equipmentList: equipmentList,
    hideFinancialDetails: false
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
                  onClick={() => navigate('/ambassador/offers')}
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
                      onOpenCatalog={handleOpenCatalog}
                      coefficient={coefficient}
                      monthlyPayment={monthlyPayment}
                      targetMonthlyPayment={targetMonthlyPayment}
                      setTargetMonthlyPayment={setTargetMonthlyPayment}
                      calculatedMargin={calculatedMargin}
                      applyCalculatedMargin={applyCalculatedMargin}
                      hideFinancialDetails={false}
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
                    hideFinancialDetails={false}
                  />
                  
                  <ClientInfo
                    clientId={clientInfoProps.clientId}
                    clientName={clientInfoProps.clientName}
                    clientEmail={clientInfoProps.clientEmail}
                    clientCompany={clientInfoProps.clientCompany}
                    remarks={clientInfoProps.remarks}
                    setRemarks={clientInfoProps.setRemarks}
                    onOpenClientSelector={clientInfoProps.onOpenClientSelector}
                    handleSaveOffer={clientInfoProps.handleSaveOffer}
                    isSubmitting={clientInfoProps.isSubmitting}
                    selectedLeaser={clientInfoProps.selectedLeaser}
                    equipmentList={clientInfoProps.equipmentList}
                    hideFinancialDetails={false}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </Container>
    </PageTransition>
  );
};

export default AmbassadorCreateOffer;
