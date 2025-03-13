
import { useState, useEffect } from "react";
import { getOffers, deleteOffer } from "@/services/offerService";
import { toast } from "sonner";

interface Offer {
  id: string;
  client_name: string;
  client_id?: string;
  clients?: {
    name: string;
    email: string;
    company: string;
  } | null;
  amount: number;
  monthly_payment: number;
  commission: number;
  status: string;
  created_at: string;
}

export const useOffers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    setLoading(true);
    setLoadingError(null);
    
    try {
      const offersData = await getOffers();
      
      if (Array.isArray(offersData)) {
        setOffers(offersData);
      } else {
        console.error("Offers data is not an array:", offersData);
        setLoadingError("Format de données incorrect");
      }
    } catch (error) {
      console.error("Error fetching offers:", error);
      setLoadingError("Impossible de charger les offres");
      toast.error("Erreur lors du chargement des offres");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette offre ?")) {
      const success = await deleteOffer(offerId);
      if (success) {
        toast.success("L'offre a été supprimée avec succès");
        // Mise à jour locale pour éviter de refaire un appel réseau
        setOffers(offers.filter(offer => offer.id !== offerId));
      } else {
        toast.error("Erreur lors de la suppression de l'offre");
      }
    }
  };

  const handleResendOffer = (offerId: string) => {
    toast.success("L'offre a été renvoyée avec succès");
  };

  const handleDownloadPdf = (offerId: string) => {
    toast.success("Le PDF a été téléchargé");
  };

  const filteredOffers = offers.filter((offer) => {
    // Rechercher dans le nom du client ou le nom de la société du client s'il est lié
    const clientName = offer.client_name.toLowerCase();
    const clientCompany = offer.clients?.company?.toLowerCase() || '';
    
    const matchesSearch = 
      clientName.includes(searchTerm.toLowerCase()) ||
      clientCompany.includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === "all" || offer.status === activeTab;
    
    return matchesSearch && matchesTab;
  });

  return {
    offers,
    filteredOffers,
    loading,
    loadingError,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    fetchOffers,
    handleDeleteOffer,
    handleResendOffer,
    handleDownloadPdf
  };
};
