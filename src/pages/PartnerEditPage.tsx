
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PartnerEditForm from "@/components/crm/forms/PartnerEditForm";
import { getPartnerById, Partner } from "@/services/partnerService";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const PartnerEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);

  useEffect(() => {
    if (!id) {
      toast.error("ID de partenaire manquant");
      navigate("/partners");
      return;
    }

    const loadPartner = async () => {
      try {
        const partnerData = await getPartnerById(id);
        if (!partnerData) {
          toast.error("Partenaire introuvable");
          navigate("/partners");
          return;
        }
        setPartner(partnerData);
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors du chargement du partenaire:", error);
        setError("Erreur lors du chargement du partenaire");
        toast.error("Erreur lors du chargement du partenaire");
        navigate("/partners");
      }
    };

    loadPartner();
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
          onClick={() => navigate("/partners")}
        >
          Retour à la liste
        </button>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="p-4 text-center">
        <h1 className="text-xl font-bold mb-2">Partenaire introuvable</h1>
        <p className="text-muted-foreground mb-4">Le partenaire demandé n'existe pas ou n'est plus disponible.</p>
        <button 
          className="px-4 py-2 bg-primary text-white rounded-md" 
          onClick={() => navigate("/partners")}
        >
          Retour à la liste
        </button>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <PartnerEditForm partnerData={partner} />
    </div>
  );
};

export default PartnerEditPage;
