
import { useState, useEffect } from "react";
import { getOffers } from "@/services/offerService";
import { toast } from "sonner";
import { OFFER_STATUSES } from "@/components/offers/OfferStatusBadge";

export interface Offer {
  id: string;
  client_name: string;
  clientId?: string;
  client_id?: string; // Added for compatibility
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
      // Remove the parameter as getOffers() doesn't accept any
      const offersData = await getOffers();
      
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
              case "draft":
              // Changed to check if status is 'pending' instead of comparing
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
            // Use optional chaining to safely access clientId or client_id
            return {
              ...offer,
              type: offer.clientId || (offer as any).client_id ? 'client_request' : 'admin_offer'
            };
          }
          return offer;
        });
        
        console.log(`Loaded ${offersWithType.length} offers. Includes converted: ${includeConverted}`);
        console.log("Converted offers:", offersWithType.filter(o => o.converted_to_contract).length);
        
        // Cast the offers to the Offer type
        const typedOffers = offersWithType as Offer[];
        setOffers(typedOffers);
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
