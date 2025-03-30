
import React from "react";
import { Product } from "@/types/catalog";
import { formatCurrency } from "@/utils/formatters";

interface ProductPricingProps {
  product: Product;
  hasVariants: boolean;
}

const ProductPricing: React.FC<ProductPricingProps> = ({ product, hasVariants }) => {
  const calculateMonthlyPrice = (): string | number => {
    let productMonthlyPrice: string | number = "Non définie";
    
    if (hasVariants) {
      if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
        const variantPrices = product.variant_combination_prices
          .map(variant => variant.monthly_price || 0)
          .filter(price => price > 0);
          
        if (variantPrices.length > 0) {
          const minPrice = Math.min(...variantPrices);
          console.log(`Variant combination min price: ${minPrice}`);
          productMonthlyPrice = formatCurrency(minPrice);
        }
      } else if (product.variants && product.variants.length > 0) {
        const variantPrices = product.variants
          .map(variant => variant.monthly_price || 0)
          .filter(price => price > 0);
          
        if (variantPrices.length > 0) {
          const minPrice = Math.min(...variantPrices);
          console.log(`Variant min price: ${minPrice}`);
          productMonthlyPrice = formatCurrency(minPrice);
        }
      }
    } else if (product?.monthly_price) {
      console.log(`Base monthly price: ${product.monthly_price}`);
      productMonthlyPrice = formatCurrency(product.monthly_price);
    }
    
    return productMonthlyPrice;
  };
  
  const calculatePrice = (): string => {
    let productPrice: number | string = product?.price || 0;
    
    if (typeof productPrice === 'number') {
      productPrice = formatCurrency(productPrice);
    }
    
    return productPrice;
  };
  
  const productPrice = calculatePrice();
  const productMonthlyPrice = calculateMonthlyPrice();
  
  return (
    <div className="mt-3 space-y-1">
      {productPrice !== "0,00 €" && (
        <p className="text-gray-700">
          Prix: <span className="font-semibold">{productPrice}</span>
        </p>
      )}
      
      {productMonthlyPrice !== "Non définie" && (
        <p className="text-gray-700">
          {hasVariants ? "À partir de " : "Mensualité: "}
          <span className="font-bold text-indigo-700">{productMonthlyPrice}{hasVariants && "/mois"}</span>
        </p>
      )}
    </div>
  );
};

export default ProductPricing;
