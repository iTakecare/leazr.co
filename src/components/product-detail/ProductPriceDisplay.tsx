
import React from "react";
import { formatCurrency } from "@/utils/formatters";

interface ProductPriceDisplayProps {
  currentPrice: number | null;
  minimumPrice: number;
}

const ProductPriceDisplay: React.FC<ProductPriceDisplayProps> = ({ 
  currentPrice, 
  minimumPrice 
}) => {
  // S'assurer que le prix actuel et le prix minimum sont des nombres valides
  const displayCurrentPrice = currentPrice && !isNaN(currentPrice) && currentPrice > 0 
    ? currentPrice 
    : null;
    
  const displayMinimumPrice = !isNaN(minimumPrice) && minimumPrice > 0 
    ? minimumPrice 
    : 0;
    
  console.log("ProductPriceDisplay values:", { 
    originalCurrentPrice: currentPrice,
    originalMinimumPrice: minimumPrice,
    displayCurrentPrice,
    displayMinimumPrice
  });

  return (
    <div className="text-lg text-gray-700 mb-4">
      {displayCurrentPrice ? (
        <span className="font-bold text-[#4ab6c4]">{formatCurrency(displayCurrentPrice)}/mois</span>
      ) : (
        <>
          à partir de <span className="font-bold text-[#4ab6c4]">{formatCurrency(displayMinimumPrice)}/mois</span>
        </>
      )}
    </div>
  );
};

export default ProductPriceDisplay;
