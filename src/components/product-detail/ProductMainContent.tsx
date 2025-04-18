
import React from "react";
import { Product } from "@/types/catalog";
import ProductImageDisplay from "./ProductImageDisplay";
import ProductDescription from "./ProductDescription";
import ProductBenefits from "./ProductBenefits";
import OrderProcess from "./OrderProcess";
import ProductIncludedServices from "./ProductIncludedServices";

interface ProductMainContentProps {
  product: Product | null;
  productName: string;
  productDescription: string;
  currentImage: string | undefined;
  productBrand: string;
}

const ProductMainContent: React.FC<ProductMainContentProps> = ({
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
      
      <div className="mt-6">
        <ProductBenefits />
        
        <OrderProcess />
        
        <ProductIncludedServices />
      </div>
    </div>
  );
};

export default ProductMainContent;
