
import React from "react";
import { Button } from "@/components/ui/button";
import SimpleHeader from "@/components/catalog/public/SimpleHeader";

interface ProductErrorStateProps {
  onBackToCatalog: () => void;
  companyId?: string;
}

const ProductErrorState: React.FC<ProductErrorStateProps> = ({ onBackToCatalog, companyId }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <SimpleHeader companyId={companyId} />
      <div className="container mx-auto px-4 py-16 mt-24 text-center">
        <h2 className="text-2xl font-bold mb-4">Produit non trouvé</h2>
        <p className="text-gray-600 mb-8">Impossible de trouver les détails de ce produit.</p>
        <Button onClick={onBackToCatalog}>
          Retour au catalogue
        </Button>
      </div>
    </div>
  );
};

export default ProductErrorState;
