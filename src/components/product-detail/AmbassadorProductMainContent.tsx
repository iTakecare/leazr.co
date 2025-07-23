import React from "react";
import { Product } from "@/types/catalog";
import ProductImageDisplay from "./ProductImageDisplay";
import ProductDescription from "./ProductDescription";

interface AmbassadorProductMainContentProps {
  product: Product | null;
  productName: string;
  productDescription: string;
  currentImage: string | undefined;
  productBrand: string;
}

const AmbassadorProductMainContent: React.FC<AmbassadorProductMainContentProps> = ({
  product,
  productName,
  productDescription,
  currentImage,
  productBrand
}) => {
  return (
    <div>
      <ProductImageDisplay 
        imageUrl={currentImage} 
        altText={productName} 
      />
      
      <div className="mt-6">
        <ProductDescription 
          title={`Descriptif ${productBrand} ${productName}`}
          description={productDescription} 
        />
      </div>
    </div>
  );
};

export default AmbassadorProductMainContent;