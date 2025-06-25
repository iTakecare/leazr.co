
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { createOffer } from "@/services/offers";
import { OfferData } from "@/services/offers/types"; // Importer le type
import { calculateFinancedAmount } from "@/utils/calculator";
import OfferForm from "@/components/offer/OfferForm";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";

const CreateOffer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
  }, [user, navigate]);

  const handleSaveOffer = async (offerData: any) => {
    if (!user?.id) {
      toast.error("Utilisateur non authentifié");
      return;
    }

    try {
      setIsSubmitting(true);

      // Ajouter les champs obligatoires
      const fullOfferData: Partial<OfferData> = {
        ...offerData,
        user_id: user.id,
        company_id: user.company_id || 'default-company-id', // Fallback si pas de company_id
        type: 'admin_offer',
        workflow_status: 'draft',
        status: 'pending'
      };

      const { data, error } = await createOffer(fullOfferData);

      if (error) {
        console.error("Erreur lors de la création de l'offre:", error);
        toast.error(`Erreur: ${error.message || 'Impossible de créer l\'offre'}`);
        return;
      }

      toast.success("Offre créée avec succès!");
      navigate("/admin/offers");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast.error("Erreur lors de la création de l'offre");
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
          />
        </div>
      </Container>
    </PageTransition>
  );
};

export default CreateOffer;
