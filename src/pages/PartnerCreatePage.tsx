
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Building2 } from "lucide-react";
import { createPartner } from "@/services/partnerService";
import PartnerForm, { PartnerFormValues } from "@/components/crm/forms/PartnerForm";
import PageTransition from "@/components/layout/PageTransition";
import Container from "@/components/layout/Container";

const PartnerCreatePage = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: PartnerFormValues) => {
    setIsSubmitting(true);
    try {
      const newPartner = await createPartner(data);
      toast.success(`Le partenaire ${data.name} a été créé avec succès`);
      if (newPartner?.id) {
        navigate(`/partners/${newPartner.id}`);
      } else {
        navigate("/partners");
      }
    } catch (error) {
      console.error("Erreur lors de la création du partenaire:", error);
      toast.error("Erreur lors de la création du partenaire");
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
              onClick={() => navigate("/partners")}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-2xl font-bold">Créer un nouveau partenaire</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <span>Informations du partenaire</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PartnerForm
                onSubmit={onSubmit}
                onCancel={() => navigate("/partners")}
                isSubmitting={isSubmitting}
              />
            </CardContent>
          </Card>
        </div>
      </Container>
    </PageTransition>
  );
};

export default PartnerCreatePage;
