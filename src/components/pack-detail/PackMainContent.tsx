import React from "react";
import { ProductPack } from "@/types/pack";
import ProductImageDisplay from "@/components/product-detail/ProductImageDisplay";
import ProductDescription from "@/components/product-detail/ProductDescription";
import PackBenefits from "./PackBenefits";
import PackOrderProcess from "./PackOrderProcess";
import PackIncludedServices from "./PackIncludedServices";
import PackItemsList from "./PackItemsList";

interface PackMainContentProps {
  pack: ProductPack;
}

const PackMainContent: React.FC<PackMainContentProps> = ({ pack }) => {
  const getPackImage = () => {
    if (pack.image_url) return pack.image_url;
    if (pack.items && pack.items.length > 0 && pack.items[0].product?.image_url) {
      return pack.items[0].product.image_url;
    }
    return '/placeholder.svg';
  };

  const packDescription = pack.description || 
    `Ce pack contient ${pack.items?.length || 0} produit${(pack.items?.length || 0) > 1 ? 's' : ''} soigneusement sélectionné${(pack.items?.length || 0) > 1 ? 's' : ''} pour répondre à vos besoins professionnels. Tous les équipements sont reconditionnés et testés pour garantir une qualité optimale.`;

  return (
    <div>
      <ProductImageDisplay 
        imageUrl={getPackImage()} 
        altText={pack.name} 
      />
      
      <div className="mt-6">
        <ProductDescription 
          title={`Descriptif ${pack.name}`}
          description={packDescription} 
        />
      </div>

      {/* Pack Items List */}
      {pack.items && pack.items.length > 0 && (
        <div className="mt-6">
          <PackItemsList items={pack.items} />
        </div>
      )}
      
      <div className="mt-6">
        <PackBenefits />
        
        <PackOrderProcess />
        
        <PackIncludedServices />
      </div>
    </div>
  );
};

export default PackMainContent;