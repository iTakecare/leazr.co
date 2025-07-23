
import React, { useMemo } from "react";
import { formatCurrency } from "@/utils/formatters";

interface ProductPriceDisplayProps {
  currentPrice: number | null;
  minimumPrice: number;
}

const ProductPriceDisplay: React.FC<ProductPriceDisplayProps> = ({
  currentPrice,
  minimumPrice
}) => {
  // Protection contre les valeurs invalides - effectuée une seule fois
  const { displayCurrentPrice, displayMinPrice, isCurrentPriceAvailable } = useMemo(() => {
    const isValidPrice = (price: number | null): boolean => {
      return typeof price === 'number' && !isNaN(price) && price > 0 && isFinite(price);
    };
    
    return {
      displayCurrentPrice: isValidPrice(currentPrice) ? currentPrice : null,
      displayMinPrice: isValidPrice(minimumPrice) ? minimumPrice : 0,
      isCurrentPriceAvailable: isValidPrice(currentPrice)
    };
  }, [currentPrice, minimumPrice]);
  
  // Formatage effectué une seule fois
  const formattedCurrentPrice = useMemo(() => {
    return displayCurrentPrice ? formatCurrency(displayCurrentPrice) : null;
  }, [displayCurrentPrice]);
  
  const formattedMinPrice = useMemo(() => {
    return formatCurrency(displayMinPrice);
  }, [displayMinPrice]);
  
  return (
    <div className="text-lg text-gray-700 mb-4">
      {isCurrentPriceAvailable && formattedCurrentPrice ? (
        <span className="font-bold text-[#4ab6c4]">{formattedCurrentPrice}/mois</span>
      ) : displayMinPrice > 0 ? (
        <>
          à partir de <span className="font-bold text-[#4ab6c4]">{formattedMinPrice}/mois</span>
        </>
      ) : (
        <span className="font-bold text-gray-500">Non disponible</span>
      )}
    </div>
  );
};

export default ProductPriceDisplay;
