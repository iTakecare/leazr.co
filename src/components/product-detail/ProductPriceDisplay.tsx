
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
  const { displayCurrentPrice, displayMinPrice } = useMemo(() => {
    const isValidPrice = (price: number | null): boolean => {
      return typeof price === 'number' && !isNaN(price) && price > 0 && isFinite(price);
    };
    
    return {
      displayCurrentPrice: isValidPrice(currentPrice) ? currentPrice : null,
      displayMinPrice: isValidPrice(minimumPrice) ? minimumPrice : 39.99 // Valeur par défaut
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
      {formattedCurrentPrice ? (
        <span className="font-bold text-[#4ab6c4]">{formattedCurrentPrice}/mois</span>
      ) : (
        <>
          à partir de <span className="font-bold text-[#4ab6c4]">{formattedMinPrice}/mois</span>
        </>
      )}
    </div>
  );
};

export default ProductPriceDisplay;
