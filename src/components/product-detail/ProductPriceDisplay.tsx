
import React, { useMemo } from "react";
import { formatCurrency } from "@/utils/formatters";

interface ProductPriceDisplayProps {
  currentPrice: number | null;
  minimumPrice?: number;
  totalPrice?: number;
  quantity?: number;
  duration?: number;
}

const ProductPriceDisplay: React.FC<ProductPriceDisplayProps> = ({
  currentPrice,
  minimumPrice = 0,
  totalPrice,
  quantity = 1,
  duration
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
  
  // Format total price if provided
  const formattedTotalPrice = useMemo(() => {
    if (totalPrice && totalPrice > 0) {
      return formatCurrency(totalPrice);
    }
    return null;
  }, [totalPrice]);
  
  return (
    <div className="text-lg text-gray-700 mb-4">
      {formattedCurrentPrice ? (
        <div>
          <span className="font-bold text-[#4ab6c4]">{formattedCurrentPrice}/mois</span>
          
          {formattedTotalPrice && quantity && quantity > 1 && (
            <div className="text-sm mt-1">
              Total: <span className="font-semibold">{formattedTotalPrice}/mois</span> 
              <span className="text-gray-500 text-xs ml-1">
                (pour {quantity} {quantity > 1 ? 'unités' : 'unité'})
              </span>
            </div>
          )}
          
          {duration && (
            <div className="text-xs text-gray-500 mt-1">
              Durée du contrat: {duration} mois
            </div>
          )}
        </div>
      ) : (
        <>
          à partir de <span className="font-bold text-[#4ab6c4]">{formattedMinPrice}/mois</span>
        </>
      )}
    </div>
  );
};

export default ProductPriceDisplay;
