
import React from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { toast } from "sonner";

interface PriceBoxProps {
  totalPrice: number;
  onRequestOffer: () => void;
}

const PriceBox: React.FC<PriceBoxProps> = ({ totalPrice, onRequestOffer }) => {
  return (
    <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 p-6 rounded-lg border border-indigo-200 mb-6">
      <div className="flex justify-between items-center mb-4">
        <span className="text-gray-700 font-medium">Total mensuel (HT)</span>
        <span className="text-2xl font-bold text-indigo-700">{formatCurrency(totalPrice)} / mois</span>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          className="w-full sm:w-auto px-8 bg-indigo-600 hover:bg-indigo-700"
          onClick={onRequestOffer}
        >
          Demander une offre
        </Button>
        <Button 
          variant="outline" 
          className="w-full sm:w-auto border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          onClick={() => toast.info("Un conseiller vous contactera bientôt.")}
        >
          Parler à un conseiller
        </Button>
      </div>
      
      {/* Features */}
      <div className="mt-4 text-sm text-gray-600 grid grid-cols-2 gap-y-2">
        <div className="flex items-center">
          <Check className="h-4 w-4 text-indigo-500 mr-2 flex-shrink-0" />
          <span>Livraison gratuite</span>
        </div>
        <div className="flex items-center">
          <Check className="h-4 w-4 text-indigo-500 mr-2 flex-shrink-0" />
          <span>Pas de premier loyer majoré</span>
        </div>
        <div className="flex items-center">
          <Check className="h-4 w-4 text-indigo-500 mr-2 flex-shrink-0" />
          <span>Garantie étendue incluse</span>
        </div>
        <div className="flex items-center">
          <Check className="h-4 w-4 text-indigo-500 mr-2 flex-shrink-0" />
          <span>Support technique</span>
        </div>
      </div>
    </div>
  );
};

export default PriceBox;
