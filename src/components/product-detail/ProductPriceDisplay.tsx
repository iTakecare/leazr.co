
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
  console.log("ProductPriceDisplay rendering with:", { currentPrice, minimumPrice });
  
  // Ensure we have valid prices to display
  const displayCurrentPrice = currentPrice && !isNaN(currentPrice) ? currentPrice : null;
  const displayMinPrice = !isNaN(minimumPrice) ? minimumPrice : 39.99; // Fallback price
  
  return (
    <div className="text-lg text-gray-700 mb-4">
      {displayCurrentPrice ? (
        <span className="font-bold text-[#4ab6c4]">{formatCurrency(displayCurrentPrice)}/mois</span>
      ) : (
        <>
          à partir de <span className="font-bold text-[#4ab6c4]">{formatCurrency(displayMinPrice)}/mois</span>
        </>
      )}
    </div>
  );
};

export default ProductPriceDisplay;
