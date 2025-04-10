
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OfferHeaderProps {
  offerId: string;
  signed: boolean;
  isPrintingPdf: boolean;
  onPrintPdf: () => void;
}

const OfferHeader: React.FC<OfferHeaderProps> = ({ 
  offerId, 
  signed, 
  isPrintingPdf, 
  onPrintPdf 
}) => {
  return (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-2xl font-bold">Offre de leasing</h1>
        <p className="text-gray-500">Référence: {offerId?.substring(0, 8).toUpperCase()}</p>
      </div>
      <div className="flex gap-2 items-center">
        <Badge 
          variant={signed ? "secondary" : "outline"} 
          className={signed ? "bg-green-50 text-green-700 border-green-200" : ""}
        >
          {signed ? "Signée" : "En attente de signature"}
        </Badge>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onPrintPdf}
          disabled={isPrintingPdf}
          className="whitespace-nowrap"
        >
          {isPrintingPdf ? (
            <span className="flex items-center">
              <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-primary rounded-full"></span>
              Génération...
            </span>
          ) : (
            <span className="flex items-center">
              <Printer className="mr-2 h-4 w-4" />
              Imprimer PDF
            </span>
          )}
        </Button>
      </div>
    </div>
  );
};

export default OfferHeader;
