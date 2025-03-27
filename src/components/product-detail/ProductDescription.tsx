
import React, { useState } from "react";

interface ProductDescriptionProps {
  title: string;
  description: string;
}

const ProductDescription: React.FC<ProductDescriptionProps> = ({ title, description }) => {
  const [expanded, setExpanded] = useState(false);
  
  // Si la description est courte, ne pas utiliser "Voir plus"
  const isShort = description.length < 150;
  
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };
  
  const displayDescription = expanded || isShort ? description : description.substring(0, 150) + "...";
  
  return (
    <div className="mt-6 bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      
      <div className="text-gray-700">
        {description ? (
          <>
            <p className="mb-4">{displayDescription}</p>
            {!isShort && (
              <button 
                onClick={toggleExpanded}
                className="text-indigo-600 text-sm font-medium hover:text-indigo-800 transition-colors"
              >
                {expanded ? "Voir moins" : "Voir plus"}
              </button>
            )}
          </>
        ) : (
          <p className="text-gray-500 italic">Aucune description disponible pour ce produit.</p>
        )}
      </div>
    </div>
  );
};

export default ProductDescription;
