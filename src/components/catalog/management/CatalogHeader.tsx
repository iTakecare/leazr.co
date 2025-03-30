
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";

interface CatalogHeaderProps {
  onAddNewProduct: () => void;
}

const CatalogHeader: React.FC<CatalogHeaderProps> = ({ onAddNewProduct }) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 max-w-3xl">
      <h1 className="text-2xl sm:text-3xl font-bold">Gestion Catalogue</h1>
      <div className="flex gap-2">
        <Button onClick={() => navigate("/catalog/create-product")} className="flex-1 sm:flex-initial">
          <Plus className="mr-2 h-4 w-4" /> {isMobile ? "Ajouter" : "Ajouter un produit"}
        </Button>
      </div>
    </div>
  );
};

export default CatalogHeader;
