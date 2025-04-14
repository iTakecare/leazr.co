
import React from "react";
import { Product } from "@/types/catalog";
import { Button } from "@/components/ui/button";
import QuantitySelector from "@/components/product-detail/QuantitySelector";
import VariantSelector from "@/components/product-detail/VariantSelector";
import ProductPriceDisplay from "@/components/product-detail/ProductPriceDisplay";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";

interface ProductConfigurationSectionProps {
  product: Product;
  productCategory: string;
  productName: string;
  productBrand: string;
  currentPrice: number;
  minMonthlyPrice: number;
  totalPrice: number;
  quantity: number;
  duration: number;
  handleQuantityChange: (quantity: number) => void;
  selectedOptions: Record<string, string>;
  handleOptionChange: (optionName: string, value: string) => void;
  isOptionAvailable: (optionName: string, value: string) => boolean;
  variationAttributes: Record<string, string[]>;
  specifications: Record<string, any>;
  hasAttributeOptions: (attributeName: string) => boolean;
  getOptionsForAttribute: (attributeName: string) => string[];
  configAttributes: string[];
  getCurrentValue: (attribute: string) => string;
  getDisplayName: (attribute: string, value: string) => string;
  clientMode?: boolean;
}

const ProductConfigurationSection: React.FC<ProductConfigurationSectionProps> = ({
  product,
  productCategory,
  productName,
  productBrand,
  currentPrice,
  minMonthlyPrice,
  totalPrice,
  quantity,
  duration,
  handleQuantityChange,
  selectedOptions,
  handleOptionChange,
  isOptionAvailable,
  variationAttributes,
  specifications,
  hasAttributeOptions,
  getOptionsForAttribute,
  configAttributes,
  getCurrentValue,
  getDisplayName,
  clientMode = false
}) => {
  const { addToCart } = useCart();
  
  const handleAddToCart = () => {
    addToCart({
      product: product,
      quantity,
      selectedOptions,
      monthlyPrice: currentPrice,
      totalPrice: totalPrice,
      duration
    });
    
    toast.success(`${productName} ajouté au panier`, {
      description: `Qté: ${quantity} - Total mensuel: ${totalPrice.toFixed(2)}€`
    });
  };
  
  const handleRequestProduct = () => {
    // Cette action est gérée par le composant parent qui ouvre le formulaire
    if (clientMode) {
      toast.info(`Demande de produit envoyée`, {
        description: `Votre demande pour ${productName} a été envoyée avec succès.`
      });
    } else {
      toast.info(`Demande de produit`, {
        description: `Utilisez le site client pour faire une demande`
      });
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{productName}</h2>
        {productBrand && <p className="text-gray-500 mb-4">{productBrand}</p>}
        
        <div className="flex flex-col gap-2">
          <div className="text-sm text-gray-500">
            Catégorie: <span className="font-medium">{productCategory}</span>
          </div>
        </div>
      </div>
      
      <ProductPriceDisplay 
        currentPrice={currentPrice}
        minimumPrice={minMonthlyPrice}
        totalPrice={totalPrice}
        quantity={quantity}
        duration={duration}
      />
      
      <div className="space-y-4">
        <QuantitySelector 
          quantity={quantity}
          onChange={handleQuantityChange}
        />
        
        {configAttributes.map(attribute => (
          <div key={attribute}>
            {hasAttributeOptions(attribute) ? (
              <VariantSelector
                label={getDisplayName(attribute, '')}
                options={getOptionsForAttribute(attribute)}
                value={getCurrentValue(attribute)}
                onChange={value => handleOptionChange(attribute, value)}
                isOptionAvailable={value => isOptionAvailable(attribute, value)}
                getDisplayName={value => getDisplayName(attribute, value)}
              />
            ) : null}
          </div>
        ))}
      </div>
      
      <div className="pt-4 border-t border-gray-100 space-y-3">
        {clientMode ? (
          <Button
            onClick={handleRequestProduct}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Demander ce produit
          </Button>
        ) : (
          <>
            <Button
              onClick={handleAddToCart}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Ajouter au panier
            </Button>
            <Button
              onClick={handleRequestProduct}
              variant="outline"
              className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              Demander un devis
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default ProductConfigurationSection;
