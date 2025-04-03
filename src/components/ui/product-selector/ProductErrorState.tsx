
import React from "react";
import { Button } from "@/components/ui/button";

const ProductErrorState: React.FC = () => {
  return (
    <div className="text-center p-8 text-red-500">
      <p>Une erreur est survenue lors du chargement des produits.</p>
      <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
        Réessayer
      </Button>
    </div>
  );
};

export default ProductErrorState;
