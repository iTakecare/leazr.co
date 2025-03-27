
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
    <div className="bg-white p-6 rounded-lg border border-[#4ab6c4]/20 mb-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <span className="text-gray-700 font-medium">Total mensuel (HT)</span>
        <span className="text-2xl font-bold text-[#33638e]">{formatCurrency(totalPrice)} / mois</span>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          className="w-full sm:w-auto px-8 bg-[#da2959] hover:bg-[#da2959]/90 shadow-sm"
          onClick={onRequestOffer}
        >
          Demander une offre
        </Button>
        <Button 
          variant="outline" 
          className="w-full sm:w-auto border-[#4ab6c4] text-[#33638e] hover:bg-[#4ab6c4]/10"
          onClick={() => toast.info("Un conseiller vous contactera bientôt.")}
        >
          Parler à un conseiller
        </Button>
      </div>
      
      {/* Features */}
      <div className="mt-4 text-sm text-gray-600 grid grid-cols-2 gap-y-2">
        <div className="flex items-center">
          <Check className="h-4 w-4 text-[#4ab6c4] mr-2 flex-shrink-0" />
          <span>Livraison en Europe</span>
        </div>
        <div className="flex items-center">
          <Check className="h-4 w-4 text-[#4ab6c4] mr-2 flex-shrink-0" />
          <span>Pas de premier loyer majoré</span>
        </div>
        <div className="flex items-center">
          <Check className="h-4 w-4 text-[#4ab6c4] mr-2 flex-shrink-0" />
          <span>Garantie étendue incluse</span>
        </div>
        <div className="flex items-center">
          <Check className="h-4 w-4 text-[#4ab6c4] mr-2 flex-shrink-0" />
          <span>Support technique</span>
        </div>
      </div>
    </div>
  );
};

export default PriceBox;
