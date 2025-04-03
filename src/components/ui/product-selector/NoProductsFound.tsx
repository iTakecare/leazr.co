
import React from "react";
import { Info } from "lucide-react";

const NoProductsFound: React.FC = () => {
  return (
    <div className="text-center p-8 text-gray-500 flex flex-col items-center">
      <Info className="h-12 w-12 text-gray-400 mb-2" />
      <p className="text-lg font-medium">Aucun produit trouvé</p>
      <p className="text-sm mt-1">Essayez de modifier vos critères de recherche</p>
    </div>
  );
};

export default NoProductsFound;
