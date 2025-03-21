
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Ambassador, getAmbassadorById } from "@/services/ambassadorService";
import AmbassadorDetailComponent from "@/components/crm/detail/AmbassadorDetail";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import PageTransition from "@/components/layout/PageTransition";
import Container from "@/components/layout/Container";

const AmbassadorDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ambassador, setAmbassador] = useState<Ambassador | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    if (!id) {
      toast.error("ID d'ambassadeur manquant");
      navigate("/ambassadors");
      return;
    }

    const loadAmbassador = async () => {
      try {
        setLoading(true);
        const data = await getAmbassadorById(id);
        if (!data) {
          setError("Ambassadeur introuvable");
          toast.error("Ambassadeur introuvable");
          setTimeout(() => navigate("/ambassadors"), 2000);
          return;
        }
        
        console.log("Ambassador data loaded:", data);
        setAmbassador(data);
        setIsDetailOpen(true);
      } catch (error: any) {
        console.error("Erreur lors du chargement de l'ambassadeur:", error);
        
        if (error.message && error.message.includes("invalid input syntax for type uuid")) {
          setError("L'identifiant fourni n'est pas valide");
          toast.error("ID d'ambassadeur invalide");
        } else {
          setError("Erreur lors du chargement de l'ambassadeur");
          toast.error("Erreur lors du chargement de l'ambassadeur");
        }
        
        setTimeout(() => navigate("/ambassadors"), 2000);
      } finally {
        setLoading(false);
      }
    };

    loadAmbassador();
  }, [id, navigate]);

  // Fonction pour gérer l'édition de l'ambassadeur
  const handleEdit = () => {
    if (ambassador && ambassador.id) {
      console.log("Navigating to edit page for ambassador:", ambassador.id);
      navigate(`/ambassadors/${ambassador.id}/edit`);
    }
  };

  // Fonction pour gérer la création d'une offre
  const handleCreateOffer = () => {
    navigate(`/ambassadors/${id}/create-offer`);
  };

  if (loading) {
    return (
      <PageTransition>
        <Container>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Chargement des données...</span>
          </div>
        </Container>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <Container>
          <div className="p-4 text-center max-w-md mx-auto mt-12">
            <div className="rounded-full bg-destructive/10 w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <span className="text-destructive text-3xl">!</span>
            </div>
            <h1 className="text-xl font-bold mb-2">Erreur</h1>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button 
              className="px-4 py-2" 
              onClick={() => navigate("/ambassadors")}
            >
              Retour à la liste
            </Button>
          </div>
        </Container>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Container>
        <div className="flex justify-between items-center mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/ambassadors")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Retour aux ambassadeurs
          </Button>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleEdit}
              className="flex items-center gap-2"
            >
              Modifier l'ambassadeur
            </Button>
            
            <Button 
              onClick={handleCreateOffer}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Créer une offre
            </Button>
          </div>
        </div>
        
        {ambassador && (
          <AmbassadorDetailComponent
            isOpen={isDetailOpen}
            onClose={() => navigate("/ambassadors")}
            ambassador={ambassador}
            onEdit={handleEdit}
            onCreateOffer={handleCreateOffer}
          />
        )}
      </Container>
    </PageTransition>
  );
};

export default AmbassadorDetail;
