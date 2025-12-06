import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useOffersQuery } from "./useOffersQuery";
import { calculateFinancedAmount } from "@/utils/calculator";
import { OfferData } from "@/services/offers/types";
import { calculateOfferMargin } from "@/utils/marginCalculations";

// Define and export the Offer interface
export interface Offer extends OfferData {
  id: string;
  client_name: string;
  monthly_payment: number;
  created_at: string;
  ambassador_id?: string;
  leaser_name?: string;
  business_sector?: string;
  total_purchase_price?: number;
  margin_percentage?: number;
  internal_score?: string | null;
  leaser_score?: string | null;
  has_recent_documents?: boolean;
  is_purchase?: boolean;
  offer_custom_packs?: Array<{
    id: string;
    pack_name: string;
    discount_percentage: number;
  }>;
}

export const useFetchOffers = () => {
  const [includeConverted, setIncludeConverted] = useState(true);
  
  // Utiliser React Query pour les données
  const { data: rawOffers = [], isLoading: loading, error: queryError, refetch: fetchOffers } = useOffersQuery(includeConverted);
  
  // Mémoriser les calculs pour éviter les re-renders inutiles
  const offers: Offer[] = useMemo(() => {
    return rawOffers.map(offer => {
      // Calculate total purchase price from equipment
      const totalPurchasePrice = offer.offer_equipment?.reduce(
        (sum: number, eq: any) => sum + ((eq.purchase_price || 0) * (eq.quantity || 1)), 
        0
      ) || 0;
      
      // Si c'est un achat, la mensualité est TOUJOURS 0
      const isPurchase = offer.is_purchase === true;
      
      // monthly_payment en DB est DÉJÀ le total pour cet équipement (pas unitaire)
      const totalMonthlyPayment = isPurchase ? 0 : (offer.offer_equipment || []).reduce(
        (sum: number, eq: any) => sum + (Number(eq.monthly_payment) || 0), 
        0
      );
      
      // Calculate margin percentage using centralized utility
      const computedMarginPct = calculateOfferMargin(offer as any, offer.offer_equipment) || 0;
      
      // Mensualité finale : 0 pour les achats, sinon calcul normal
      const finalMonthlyPayment = isPurchase 
        ? 0 
        : (totalMonthlyPayment > 0 ? totalMonthlyPayment : Number(offer.monthly_payment) || 0);
        
      // If financed_amount is missing or zero but we have monthly_payment
      if (!isPurchase && (!offer.financed_amount || offer.financed_amount === 0) && offer.monthly_payment) {
        const coefficient = offer.coefficient || 3.27;
        const calculatedAmount = calculateFinancedAmount(
          Number(offer.monthly_payment), 
          Number(coefficient)
        );
        
        return {
          ...offer,
          financed_amount: calculatedAmount,
          leaser_name: offer.leasers?.name || null,
          business_sector: offer.clients?.business_sector || null,
          total_purchase_price: totalPurchasePrice,
          margin_percentage: computedMarginPct,
          created_at: offer.created_at || new Date().toISOString(),
          monthly_payment: finalMonthlyPayment,
          is_purchase: isPurchase
        } as Offer;
      }
      
      return {
        ...offer,
        leaser_name: offer.leasers?.name || null,
        business_sector: offer.clients?.business_sector || null,
        total_purchase_price: totalPurchasePrice,
        margin_percentage: computedMarginPct,
        created_at: offer.created_at || new Date().toISOString(),
        monthly_payment: finalMonthlyPayment,
        is_purchase: isPurchase
      } as Offer;
    });
  }, [rawOffers]);
  
  const loadingError = queryError ? (queryError as Error).message : null;

  return {
    offers,
    loading,
    loadingError,
    includeConverted,
    setIncludeConverted,
    fetchOffers
  };
};
