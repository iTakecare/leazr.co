
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
  return (
    <div className="text-lg text-gray-700 mb-4">
      {currentPrice ? (
        <span className="font-bold text-indigo-700">{formatCurrency(currentPrice)}/mois</span>
      ) : (
        <>
          à partir de <span className="font-bold text-indigo-700">{formatCurrency(minimumPrice)}/mois</span>
        </>
      )}
    </div>
  );
};

export default ProductPriceDisplay;
