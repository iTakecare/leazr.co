
import React from "react";
import { Product } from "@/types/catalog";
import ProductImageGallery from "./ProductImageGallery";
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
  // Get all product images
  const getProductImages = (): string[] => {
    const images: string[] = [];
    
    // Add main image if exists
    if (currentImage && currentImage !== '/placeholder.svg') {
      images.push(currentImage);
    }
    
    // Add additional images from image_urls
    if (product?.image_urls && Array.isArray(product.image_urls)) {
      const validImages = product.image_urls.filter(url => 
        url && 
        typeof url === 'string' && 
        url.trim() !== '' && 
        !url.includes('.emptyFolderPlaceholder') &&
        !url.includes('undefined') &&
        url !== '/placeholder.svg' &&
        !images.includes(url) // Avoid duplicates
      );
      images.push(...validImages);
    }
    
    // Add additional images from imageUrls (alternative property)
    if (product?.imageUrls && Array.isArray(product.imageUrls)) {
      const validImages = product.imageUrls.filter(url => 
        url && 
        typeof url === 'string' && 
        url.trim() !== '' && 
        !url.includes('.emptyFolderPlaceholder') &&
        !url.includes('undefined') &&
        url !== '/placeholder.svg' &&
        !images.includes(url) // Avoid duplicates
      );
      images.push(...validImages);
    }
    
    return images;
  };

  const productImages = getProductImages();

  return (
    <div>
      <ProductImageGallery 
        images={productImages}
        productName={productName}
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
