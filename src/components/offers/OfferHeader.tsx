
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
    <div className="mb-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Offre de financement
          </h1>
          <p className="text-gray-600 text-lg">
            Référence: <span className="font-mono font-semibold">{offerId?.substring(0, 8).toUpperCase()}</span>
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Badge 
            variant={signed ? "secondary" : "outline"} 
            className={`text-sm px-3 py-1 ${
              signed 
                ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-200" 
                : "bg-orange-100 text-orange-800 border-orange-200"
            }`}
          >
            {signed ? "✓ Signée" : "⏳ En attente de signature"}
          </Badge>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onPrintPdf}
            disabled={isPrintingPdf}
            className="whitespace-nowrap hover:bg-blue-50 border-blue-200"
          >
            {isPrintingPdf ? (
              <span className="flex items-center">
                <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-blue-600 rounded-full"></span>
                Génération PDF...
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
      
      {/* Ligne de séparation */}
      <div className="mt-6 border-b border-gray-200"></div>
    </div>
  );
};

export default OfferHeader;
