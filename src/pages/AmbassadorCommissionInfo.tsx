
import React from "react";
import PageTransition from "@/components/layout/PageTransition";
import Container from "@/components/layout/Container";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import AmbassadorCommissionDebug from "@/components/debug/AmbassadorCommissionDebug";

const AmbassadorCommissionInfo = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    return (
      <PageTransition>
        <Container>
          <div className="p-4 text-center">
            <h1 className="text-xl font-bold mb-4">Erreur: ID d'ambassadeur manquant</h1>
            <Button onClick={() => navigate("/ambassadors")}>Retour aux ambassadeurs</Button>
          </div>
        </Container>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Container>
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Retour
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold">Informations de commission</h1>
          <p className="text-muted-foreground">
            Détails du barème de commissionnement pour l'ambassadeur {id}
          </p>
        </div>

        <AmbassadorCommissionDebug ambassadorId={id} />
      </Container>
    </PageTransition>
  );
};

export default AmbassadorCommissionInfo;
