
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
  equipment_description?: string;
  additional_info?: string;
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
      // getOffers doesn't accept any parameters
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
                workflowStatus = OFFER_STATUSES.DRAFT.id;
                break;
              default:
                // Handle "pending" separately - fix comparison error
                workflowStatus = offer.status === "pending" 
                  ? OFFER_STATUSES.DRAFT.id 
                  : OFFER_STATUSES.DRAFT.id;
            }
            return { ...offer, workflow_status: workflowStatus };
          }
          return offer;
        });
        
        const offersWithType = offersWithWorkflow.map(offer => {
          if (!offer.type) {
            // Use optional chaining to safely access clientId or client_id
            const clientIdentifier = offer.clientId || offer.client_id;
            return {
              ...offer,
              type: clientIdentifier ? 'client_request' : 'admin_offer',
              // Ensure both clientId and client_id are set for backward compatibility
              clientId: clientIdentifier,
              client_id: clientIdentifier
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
