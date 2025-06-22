
import React from "react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";
import { useAuth } from "@/context/AuthContext";

interface ProductPricingProps {
  product: any;
  selectedVariant?: any;
  quantity?: number;
}

const ProductPricing: React.FC<ProductPricingProps> = ({
  product,
  selectedVariant,
  quantity = 1
}) => {
  const { isAdmin } = useAuth();

  const shouldShowPurchasePrice = isAdmin;
  
  const getDisplayPrice = () => {
    if (selectedVariant) {
      return {
        price: selectedVariant.price || 0,
        monthlyPrice: selectedVariant.monthly_price || 0
      };
    }
    
    return {
      price: product.price || 0,
      monthlyPrice: product.monthly_price || 0
    };
  };

  const { price, monthlyPrice } = getDisplayPrice();
  const totalPrice = price * quantity;
  const totalMonthlyPrice = monthlyPrice * quantity;

  return (
    <div className="space-y-3">
      {shouldShowPurchasePrice && price > 0 && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">Prix d'achat</span>
          <span className="font-semibold text-gray-900">
            {formatCurrency(totalPrice)}
          </span>
        </div>
      )}
      
      {monthlyPrice > 0 && (
        <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-200">
          <span className="text-sm text-indigo-700 font-medium">Mensualité de leasing</span>
          <div className="text-right">
            <span className="text-xl font-bold text-indigo-900">
              {formatCurrency(totalMonthlyPrice)}
            </span>
            <span className="text-sm text-indigo-600 ml-1">/mois</span>
          </div>
        </div>
      )}
      
      {monthlyPrice === 0 && price === 0 && (
        <div className="flex items-center justify-center p-3 bg-gray-50 rounded-lg border border-gray-200">
          <Badge variant="secondary" className="text-gray-600">
            Prix sur demande
          </Badge>
        </div>
      )}
      
      {quantity > 1 && (
        <div className="text-xs text-gray-500 text-center">
          Quantité: {quantity} • Prix unitaire: {formatCurrency(monthlyPrice)}/mois
        </div>
      )}
    </div>
  );
};

export default ProductPricing;
