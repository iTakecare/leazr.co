
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserPlus } from "lucide-react";
import { createAmbassador } from "@/services/ambassadorService";
import AmbassadorForm, { AmbassadorFormValues } from "@/components/crm/forms/AmbassadorForm";
import PageTransition from "@/components/layout/PageTransition";
import Container from "@/components/layout/Container";

const AmbassadorCreatePage = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: AmbassadorFormValues) => {
    setIsSubmitting(true);
    try {
      console.log("Submitting ambassador data:", data);
      const newAmbassador = await createAmbassador({
        name: data.name,
        email: data.email,
        phone: data.phone,
        status: data.status || 'active',
        notes: data.notes,
        company: data.company,
        vat_number: data.vat_number,
        address: data.address,
        city: data.city,
        postal_code: data.postal_code,
        country: data.country
      });
      
      console.log("Ambassador creation result:", newAmbassador);
      
      if (newAmbassador) {
        toast.success(`L'ambassadeur ${data.name} a été créé avec succès`);
        // Make sure we have an ID before navigating
        if (newAmbassador.id) {
          navigate(`/ambassadors/${newAmbassador.id}`);
        } else {
          navigate("/ambassadors");
        }
      } else {
        throw new Error("Échec de la création de l'ambassadeur");
      }
    } catch (error) {
      console.error("Erreur lors de la création de l'ambassadeur:", error);
      toast.error("Erreur lors de la création de l'ambassadeur");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <Container>
        <div className="max-w-4xl mx-auto py-6">
          <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate("/ambassadors")}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-2xl font-bold">Créer un nouvel ambassadeur</h1>
          </div>

          <AmbassadorForm
            onSubmit={onSubmit}
            onCancel={() => navigate("/ambassadors")}
            isSubmitting={isSubmitting}
          />
        </div>
      </Container>
    </PageTransition>
  );
};

export default AmbassadorCreatePage;
