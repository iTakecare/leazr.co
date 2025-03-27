
import React from "react";

interface ProductDescriptionProps {
  title: string;
  description: string;
}

const ProductDescription: React.FC<ProductDescriptionProps> = ({ title, description }) => {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      
      <div className="text-gray-700">
        <p className="mb-4">
          Le MacBook Air 15" M4 d'Apple est l'équipement idéal pour les entreprises et les professionnels à la recherche d'un ordinateur 
          portable alliant performance, portabilité et élégance. Ce modèle de 15,3 pouces offre une expérience utilisateur exceptionnelle grâce 
          à des caractéristiques techniques avancées. Voici un aperçu détaillé de ses principales caractéristiques du MacBook Air 15" M4 :
        </p>
        
        <p className="mb-4">
          {description}
        </p>
      </div>
    </div>
  );
};

export default ProductDescription;
