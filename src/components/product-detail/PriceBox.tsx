
import React from "react";
import { Button } from "@/components/ui/button";
import { Check, Info } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { toast } from "sonner";
import AddToCartButton from "./AddToCartButton";

interface PriceBoxProps {
  totalPrice: number;
  duration: number;
  onRequestOffer: () => void;
  product?: any;
  quantity?: number;
  selectedOptions?: Record<string, string>;
}

const PriceBox: React.FC<PriceBoxProps> = ({ 
  totalPrice, 
  duration,
  onRequestOffer,
  product,
  quantity = 1,
  selectedOptions = {}
}) => {
  return (
    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-700">Pour {duration} mois</span>
        <span className="text-xl font-bold text-[#2d618f]">{formatCurrency(totalPrice)} HT / mois</span>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        {product ? (
          <AddToCartButton 
            product={product}
            quantity={quantity}
            duration={duration}
            selectedOptions={selectedOptions}
            navigateToCart={false}
          />
        ) : (
          <Button 
            className="text-sm w-full sm:w-auto px-6 bg-[#2d618f] hover:bg-[#347599]"
            onClick={onRequestOffer}
          >
            Ajouter
          </Button>
        )}
        
        <Button 
          variant="outline" 
          className="text-sm w-full sm:w-auto border-blue-200 text-[#2d618f] hover:bg-blue-50"
          onClick={() => toast.info("Un conseiller vous contactera bientôt.")}
        >
          <Info className="h-4 w-4 mr-1" />
          Conseiller
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-1 text-xs">
        <div className="flex items-center text-gray-600">
          <Check className="h-3 w-3 text-[#347599] mr-1 flex-shrink-0" />
          <span>Livraison gratuite</span>
        </div>
        <div className="flex items-center text-gray-600">
          <Check className="h-3 w-3 text-[#347599] mr-1 flex-shrink-0" />
          <span>Pas de loyer majoré</span>
        </div>
      </div>
    </div>
  );
};

export default PriceBox;
