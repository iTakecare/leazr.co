
import React from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { toast } from "sonner";

interface PriceBoxProps {
  totalPrice: number;
  duration: number;
  onRequestOffer: () => void;
}

const PriceBox: React.FC<PriceBoxProps> = ({ 
  totalPrice, 
  duration,
  onRequestOffer 
}) => {
  return (
    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-gray-700 font-medium">Votre sélection pour {duration} mois</span>
        <span className="text-2xl font-bold text-[#2d618f]">{formatCurrency(totalPrice)} HT / mois</span>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Button 
          className="w-full sm:w-auto px-8 bg-[#2d618f] hover:bg-[#347599]"
          onClick={onRequestOffer}
        >
          Ajouter
        </Button>
        <Button 
          variant="outline" 
          className="w-full sm:w-auto border-blue-200 text-[#2d618f] hover:bg-blue-50"
          onClick={() => toast.info("Un conseiller vous contactera bientôt.")}
        >
          Parler à un conseiller
        </Button>
      </div>
      
      <div className="space-y-1 text-sm">
        <div className="flex items-center text-gray-600">
          <Check className="h-4 w-4 text-[#347599] mr-2" />
          <span>Livraison gratuite en Europe</span>
        </div>
        <div className="flex items-center text-gray-600">
          <Check className="h-4 w-4 text-[#347599] mr-2" />
          <span>Pas de premier loyer majoré</span>
        </div>
      </div>
    </div>
  );
};

export default PriceBox;
