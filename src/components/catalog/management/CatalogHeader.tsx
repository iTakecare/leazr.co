
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, ExternalLink } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMultiTenant } from "@/hooks/useMultiTenant";

interface CatalogHeaderProps {
  onAddNewProduct: () => void;
}

const CatalogHeader: React.FC<CatalogHeaderProps> = ({ onAddNewProduct }) => {
  const isMobile = useIsMobile();
  const { companyId } = useMultiTenant();
  
  const handleViewPublicCatalog = () => {
    if (companyId === 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0') {
      // Pour iTakecare, utiliser directement le slug
      window.open(`/itakecare/catalog`, "_blank");
    } else if (companyId) {
      // Pour les autres entreprises, utiliser l'URL avec ID
      window.open(`/public/${companyId}/catalog`, "_blank");
    } else {
      // Fallback vers le catalogue multi-tenant authentifié
      window.open("/catalog", "_blank");
    }
  };
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Gestion Catalogue</h1>
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          onClick={handleViewPublicCatalog}
          className="flex-1 sm:flex-initial"
        >
          <ExternalLink className="mr-2 h-4 w-4" /> 
          {isMobile ? "Catalogue" : "Voir le catalogue public"}
        </Button>
        <Button onClick={onAddNewProduct} className="flex-1 sm:flex-initial">
          <Plus className="mr-2 h-4 w-4" /> 
          {isMobile ? "Ajouter" : "Ajouter un produit"}
        </Button>
      </div>
    </div>
  );
};

export default CatalogHeader;
