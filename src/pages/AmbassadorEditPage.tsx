
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import AmbassadorEditForm from "@/components/crm/forms/AmbassadorEditForm";
import { getAmbassadorById } from "@/services/ambassadorService";
import { Ambassador } from "@/services/ambassadorService";

const AmbassadorEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ambassador, setAmbassador] = useState<Ambassador | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("AmbassadorEditPage - ID from params:", id);
    
    if (!id) {
      console.error("AmbassadorEditPage - No ID provided");
      toast.error("ID d'ambassadeur manquant");
      navigate("/ambassadors");
      return;
    }

    const fetchAmbassador = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("AmbassadorEditPage - Fetching ambassador with ID:", id);
        
        const ambassadorData = await getAmbassadorById(id);
        
        console.log("AmbassadorEditPage - Ambassador data received:", ambassadorData);
        setAmbassador(ambassadorData);
      } catch (error) {
        console.error('AmbassadorEditPage - Error fetching ambassador:', error);
        setError("Erreur lors du chargement des données ambassadeur");
        toast.error("Erreur lors du chargement des données ambassadeur");
      } finally {
        setLoading(false);
      }
    };

    fetchAmbassador();
  }, [id, navigate]);

  const handleAmbassadorUpdated = (updatedAmbassador?: Ambassador) => {
    console.log("AmbassadorEditPage - Ambassador updated:", updatedAmbassador);
    if (updatedAmbassador) {
      setAmbassador(updatedAmbassador);
      toast.success("Ambassadeur mis à jour avec succès");
    }
    navigate(`/ambassadors/${id}`);
  };

  const handleCancel = () => {
    console.log("AmbassadorEditPage - Cancel edit, navigating back to ambassador detail");
    navigate(`/ambassadors/${id}`);
  };

  if (loading) {
    return (
      <PageTransition>
        <Container>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Chargement...</span>
          </div>
        </Container>
      </PageTransition>
    );
  }

  if (error || !ambassador) {
    return (
      <PageTransition>
        <Container>
          <div className="text-center py-12">
            <div className="rounded-full bg-destructive/10 w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <span className="text-destructive text-3xl">!</span>
            </div>
            <h2 className="text-xl font-semibold mb-4">{error || "Ambassadeur introuvable"}</h2>
            <div className="space-x-2">
              <Button variant="outline" onClick={() => navigate("/ambassadors")}>
                Retour à la liste des ambassadeurs
              </Button>
              {id && (
                <Button onClick={() => window.location.reload()}>
                  Réessayer
                </Button>
              )}
            </div>
          </div>
        </Container>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Container>
        <div className="py-6">
          <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-2xl font-bold">Modifier l'ambassadeur</h1>
          </div>

          <AmbassadorEditForm
            ambassadorData={ambassador}
            onAmbassadorUpdated={handleAmbassadorUpdated}
            onCancel={handleCancel}
          />
        </div>
      </Container>
    </PageTransition>
  );
};

export default AmbassadorEditPage;
