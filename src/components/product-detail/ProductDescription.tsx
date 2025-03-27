
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
          {description}
        </p>
      </div>
    </div>
  );
};

export default ProductDescription;
