
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { createOffer } from "@/services/offers";
import { calculateFinancedAmount } from "@/utils/calculator";
import { Equipment, GlobalMarginAdjustment } from "@/types/equipment";
import { Client } from "@/types/client";
import OfferForm from "@/components/offer/OfferForm";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { supabase } from "@/integrations/supabase/client";

const PartnerCreateOffer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partner, setPartner] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    
    // Récupérer les infos du partenaire
    const fetchPartner = async () => {
      const { data } = await supabase
        .from('partners')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      setPartner(data);
    };
    
    fetchPartner();
  }, [user, navigate]);

  const handleSaveOffer = async (offerFormData: {
    client: Client | null;
    equipmentList: Equipment[];
    globalMarginAdjustment: GlobalMarginAdjustment;
    coefficient: number;
    remarks: string;
    totalMonthlyPayment: number;
  }) => {
    if (!user?.id) {
      toast.error("Utilisateur non authentifié");
      return;
    }

    if (!offerFormData.client) {
      toast.error("Veuillez sélectionner un client");
      return;
    }

    if (offerFormData.equipmentList.length === 0) {
      toast.error("Veuillez ajouter au moins un équipement");
      return;
    }

    if (!partner?.company_id) {
      toast.error("Company ID manquant pour le partenaire");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const equipmentDescription = JSON.stringify(
        offerFormData.equipmentList.map(eq => ({
          title: eq.title,
          purchasePrice: eq.purchasePrice,
          quantity: eq.quantity,
          margin: eq.margin
        }))
      );
      
      const equipmentText = offerFormData.equipmentList
        .map(eq => `${eq.title} (${eq.quantity}x)`)
        .join(", ");
      
      const currentCoefficient = offerFormData.coefficient || offerFormData.globalMarginAdjustment.newCoef || 3.27;
      const financedAmount = calculateFinancedAmount(offerFormData.totalMonthlyPayment, currentCoefficient);
      
      // Convertir en nombre au lieu de string
      const totalMarginWithDifference = Number(offerFormData.globalMarginAdjustment.marginDifference || 0);
      
      const offerData = {
        user_id: user.id,
        client_name: offerFormData.client.name,
        client_email: offerFormData.client.email || "",
        client_id: offerFormData.client.id!,
        equipment_description: equipmentDescription,
        equipment_text: equipmentText,
        amount: offerFormData.globalMarginAdjustment.amount + offerFormData.equipmentList.reduce((sum, eq) => sum + (eq.purchasePrice * eq.quantity), 0),
        coefficient: currentCoefficient,
        monthly_payment: offerFormData.totalMonthlyPayment,
        financed_amount: financedAmount,
        workflow_status: "draft",
        type: "partner_offer",
        company_id: partner.company_id,
        remarks: offerFormData.remarks,
        total_margin_with_difference: totalMarginWithDifference // Convertir en nombre
      };
      
      const { data, error } = await createOffer(offerData);
      
      if (error) {
        console.error("Erreur lors de la sauvegarde:", error);
        toast.error(`Impossible de sauvegarder l'offre: ${error.message || 'Erreur inconnue'}`);
        return;
      }
      
      toast.success("Offre créée avec succès!");
      navigate("/partner/offers");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de l'offre:", error);
      toast.error("Impossible de sauvegarder l'offre");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <PageTransition>
      <Container>
        <div className="py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Créer une nouvelle offre</h1>
            <p className="text-muted-foreground">
              Créez une offre de financement pour un client
            </p>
          </div>
          
          <OfferForm
            onSave={handleSaveOffer}
            isSubmitting={isSubmitting}
            userRole="partner"
          />
        </div>
      </Container>
    </PageTransition>
  );
};

export default PartnerCreateOffer;
