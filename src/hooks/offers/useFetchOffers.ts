import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useOffersQuery } from "./useOffersQuery";
import { calculateFinancedAmount } from "@/utils/calculator";
import { OfferData } from "@/services/offers/types";

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
}

export const useFetchOffers = () => {
  const [includeConverted, setIncludeConverted] = useState(true);
  
  // Utiliser React Query pour les données
  const { data: rawOffers = [], isLoading: loading, error: queryError, refetch: fetchOffers } = useOffersQuery(includeConverted);
  
  // Traiter les offres pour les enrichir
  const offers: Offer[] = rawOffers.map(offer => {
    // Calculate total purchase price from equipment
    const totalPurchasePrice = offer.offer_equipment?.reduce(
      (sum: number, eq: any) => sum + ((eq.purchase_price || 0) * (eq.quantity || 1)), 
      0
    ) || 0;
    
    // Calculate average margin percentage from equipment
    const equipmentWithMargin = offer.offer_equipment?.filter((eq: any) => eq.margin != null) || [];
    const avgMarginPercentage = equipmentWithMargin.length > 0
      ? equipmentWithMargin.reduce((sum: number, eq: any) => sum + (eq.margin || 0), 0) / equipmentWithMargin.length
      : offer.margin || 0;
      
    // If financed_amount is missing or zero but we have monthly_payment
    if ((!offer.financed_amount || offer.financed_amount === 0) && offer.monthly_payment) {
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
        margin_percentage: avgMarginPercentage,
        created_at: offer.created_at || new Date().toISOString(),
        monthly_payment: Number(offer.monthly_payment)
      } as Offer;
    }
    
    return {
      ...offer,
      leaser_name: offer.leasers?.name || null,
      business_sector: offer.clients?.business_sector || null,
      total_purchase_price: totalPurchasePrice,
      margin_percentage: avgMarginPercentage,
      created_at: offer.created_at || new Date().toISOString(),
      monthly_payment: Number(offer.monthly_payment)
    } as Offer;
  });
  
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
