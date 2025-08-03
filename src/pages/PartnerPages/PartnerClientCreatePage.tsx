import React from "react";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import CreateClientDialog from "@/components/clients/CreateClientDialog";
import PageTransition from "@/components/layout/PageTransition";
import Container from "@/components/layout/Container";

const PartnerClientCreatePage = () => {
  const { navigateToPartner } = useRoleNavigation();

  const handleClientCreated = () => {
    toast.success("Client créé avec succès");
    navigateToPartner("clients");
  };

  const handleCancel = () => {
    navigateToPartner("clients");
  };

  return (
    <PageTransition>
      <Container>
        <div className="max-w-4xl mx-auto py-6">
          <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-2xl font-bold">Créer un nouveau client</h1>
          </div>

          <CreateClientDialog
            open={true}
            onOpenChange={(open) => {
              if (!open) {
                handleCancel();
              }
            }}
            onClientCreated={handleClientCreated}
            isPartnerMode={true}
          />
        </div>
      </Container>
    </PageTransition>
  );
};

export default PartnerClientCreatePage;