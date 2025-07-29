import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPackById } from '@/services/packService';
import { ProductPack } from '@/types/pack';
// Local getCO2Savings function
const getCO2Savings = (category: string): number => {
  switch (category.toLowerCase()) {
    case "laptop":
    case "desktop":
      return 170;
    case "smartphone":
      return 45;
    case "tablet":
      return 87;
    default:
      return 0;
  }
};

export const usePackDetails = (packId: string | undefined) => {
  const [quantity, setQuantity] = useState(1);
  const [isRequestFormOpen, setIsRequestFormOpen] = useState(false);

  const { data: pack, isLoading, error } = useQuery({
    queryKey: ['pack', packId],
    queryFn: () => packId ? getPackById(packId) : null,
    enabled: !!packId
  });

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
    }
  };

  // Calculate current price considering promotions
  const currentPrice = useMemo(() => {
    if (!pack) return 0;
    
    // Check if promotion is active
    if (pack.promo_active && pack.pack_promo_price) {
      const now = new Date();
      const promoStart = pack.promo_valid_from ? new Date(pack.promo_valid_from) : null;
      const promoEnd = pack.promo_valid_to ? new Date(pack.promo_valid_to) : null;
      
      const isPromoValid = (!promoStart || now >= promoStart) && (!promoEnd || now <= promoEnd);
      
      if (isPromoValid) {
        return pack.pack_promo_price;
      }
    }
    
    // Return custom pack price or calculated total monthly price
    return pack.pack_monthly_price || pack.total_monthly_price;
  }, [pack]);

  // Calculate total price based on quantity
  const totalPrice = useMemo(() => {
    return currentPrice * quantity;
  }, [currentPrice, quantity]);

  // Calculate CO2 savings for all items in the pack
  const totalCO2Savings = useMemo(() => {
    if (!pack?.items) return 0;
    
    return pack.items.reduce((total, item) => {
      const category = item.product?.category_name || '';
      const itemQuantity = item.quantity || 1;
      const packQuantity = quantity;
      
      return total + (getCO2Savings(category) * itemQuantity * packQuantity);
    }, 0);
  }, [pack, quantity]);

  // Check if promotion is currently active
  const hasActivePromo = useMemo(() => {
    if (!pack || !pack.promo_active || !pack.pack_promo_price) return false;
    
    const now = new Date();
    const promoStart = pack.promo_valid_from ? new Date(pack.promo_valid_from) : null;
    const promoEnd = pack.promo_valid_to ? new Date(pack.promo_valid_to) : null;
    
    return (!promoStart || now >= promoStart) && (!promoEnd || now <= promoEnd);
  }, [pack]);

  // Calculate savings percentage if promotion is active
  const promoSavingsPercentage = useMemo(() => {
    if (!hasActivePromo || !pack) return 0;
    
    const regularPrice = pack.pack_monthly_price || pack.total_monthly_price;
    const promoPrice = pack.pack_promo_price || 0;
    
    if (regularPrice <= 0) return 0;
    
    return Math.round(((regularPrice - promoPrice) / regularPrice) * 100);
  }, [pack, hasActivePromo]);

  return {
    pack,
    isLoading,
    error,
    quantity,
    handleQuantityChange,
    isRequestFormOpen,
    setIsRequestFormOpen,
    currentPrice,
    totalPrice,
    totalCO2Savings,
    hasActivePromo,
    promoSavingsPercentage
  };
};