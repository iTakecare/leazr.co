
import { useState, useEffect } from "react";
import { getOffers } from "@/services/offerService";
import { toast } from "sonner";
import { OFFER_STATUSES } from "@/components/offers/OfferStatusBadge";

export interface Offer {
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
  workflow_status?: string;
  created_at: string;
  type: string;
  converted_to_contract?: boolean;
}

export const useFetchOffers = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [includeConverted, setIncludeConverted] = useState(true);

  const fetchOffers = async () => {
    setLoading(true);
    setLoadingError(null);
    
    try {
      console.log("Fetching offers with includeConverted =", includeConverted);
      const offersData = await getOffers(includeConverted);
      
      if (Array.isArray(offersData)) {
        const offersWithWorkflow = offersData.map(offer => {
          if (!offer.workflow_status) {
            let workflowStatus;
            switch (offer.status) {
              case "accepted":
                workflowStatus = OFFER_STATUSES.APPROVED.id;
                break;
              case "rejected":
                workflowStatus = OFFER_STATUSES.REJECTED.id;
                break;
              case "pending":
                workflowStatus = OFFER_STATUSES.DRAFT.id;
                break;
              default:
                workflowStatus = OFFER_STATUSES.DRAFT.id;
            }
            return { ...offer, workflow_status: workflowStatus };
          }
          return offer;
        });
        
        const offersWithType = offersWithWorkflow.map(offer => {
          if (!offer.type) {
            return {
              ...offer,
              type: offer.client_id ? 'client_request' : 'admin_offer'
            };
          }
          return offer;
        });
        
        console.log(`Loaded ${offersWithType.length} offers. Includes converted: ${includeConverted}`);
        console.log("Converted offers:", offersWithType.filter(o => o.converted_to_contract).length);
        
        setOffers(offersWithType);
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

  useEffect(() => {
    fetchOffers();
  }, [includeConverted]);

  return {
    offers,
    loading,
    loadingError,
    includeConverted,
    setIncludeConverted,
    fetchOffers,
    setOffers
  };
};
