
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, BadgePercent } from "lucide-react";
import { createPartner } from "@/services/partnerService";
import PartnerForm, { PartnerFormValues } from "@/components/crm/forms/PartnerForm";
import PageTransition from "@/components/layout/PageTransition";
import Container from "@/components/layout/Container";
import { Loader2 } from "lucide-react";

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
        <div className="py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => navigate("/partners")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-bold">Nouveau partenaire</h1>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BadgePercent className="h-5 w-5 text-primary" />
                <CardTitle>Informations du partenaire</CardTitle>
              </div>
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
