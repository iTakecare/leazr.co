
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface CatalogHeaderProps {
  onAddNewProduct: () => void;
}

const CatalogHeader: React.FC<CatalogHeaderProps> = ({ onAddNewProduct }) => {
  const isMobile = useIsMobile();
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Gestion Catalogue</h1>
      <div className="flex gap-2">
        <Button onClick={onAddNewProduct} className="flex-1 sm:flex-initial">
          <Plus className="mr-2 h-4 w-4" /> {isMobile ? "Ajouter" : "Ajouter un produit"}
        </Button>
      </div>
    </div>
  );
};

export default CatalogHeader;
