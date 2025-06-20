
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AmbassadorEditForm from "@/components/crm/forms/AmbassadorEditForm";
import { getAmbassadorById, Ambassador } from "@/services/ambassadorService";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const AmbassadorEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ambassador, setAmbassador] = useState<Ambassador | null>(null);

  useEffect(() => {
    if (!id) {
      toast.error("ID d'ambassadeur manquant");
      navigate("/ambassadors");
      return;
    }

    const loadAmbassador = async () => {
      try {
        const ambassadorData = await getAmbassadorById(id);
        if (!ambassadorData) {
          toast.error("Ambassadeur introuvable");
          navigate("/ambassadors");
          return;
        }
        setAmbassador(ambassadorData);
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors du chargement de l'ambassadeur:", error);
        setError("Erreur lors du chargement de l'ambassadeur");
        toast.error("Erreur lors du chargement de l'ambassadeur");
        navigate("/ambassadors");
      }
    };

    loadAmbassador();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Chargement des données...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <h1 className="text-xl font-bold mb-2">Erreur</h1>
        <p className="text-muted-foreground mb-4">{error}</p>
        <button 
          className="px-4 py-2 bg-primary text-white rounded-md" 
          onClick={() => navigate("/ambassadors")}
        >
          Retour à la liste
        </button>
      </div>
    );
  }

  if (!ambassador) {
    return (
      <div className="p-4 text-center">
        <h1 className="text-xl font-bold mb-2">Ambassadeur introuvable</h1>
        <p className="text-muted-foreground mb-4">L'ambassadeur demandé n'existe pas ou n'est plus disponible.</p>
        <button 
          className="px-4 py-2 bg-primary text-white rounded-md" 
          onClick={() => navigate("/ambassadors")}
        >
          Retour à la liste
        </button>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <AmbassadorEditForm ambassadorData={ambassador} />
    </div>
  );
};

export default AmbassadorEditPage;
