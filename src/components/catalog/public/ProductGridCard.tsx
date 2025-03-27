
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Product } from "@/types/catalog";
import { formatCurrency } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";
import VariantIndicator from "@/components/ui/product/VariantIndicator";

interface ProductGridCardProps {
  product: Product;
  onClick: () => void;
}

const ProductGridCard: React.FC<ProductGridCardProps> = ({ product, onClick }) => {
  // Skip rendering if this is a variant
  if (product.is_variation || product.parent_id) {
    return null;
  }

  const brandLabel = product.brand || "Generic";
  
  // Determine minimum monthly price considering variants
  const getMinimumMonthlyPrice = (): number => {
    let minPrice = product.monthly_price || 0;
    
    if (product.variants && product.variants.length > 0) {
      console.log(`Product ${product.name} has ${product.variants.length} variants`);
      const variantPrices = product.variants
        .map(variant => variant.monthly_price || 0)
        .filter(price => price > 0);
      
      if (variantPrices.length > 0) {
        const minVariantPrice = Math.min(...variantPrices);
        console.log(`Minimum variant price found: ${minVariantPrice}`);
        if (minVariantPrice > 0 && (minPrice === 0 || minVariantPrice < minPrice)) {
          minPrice = minVariantPrice;
        }
      }
    }
    
    if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      console.log(`Product ${product.name} has ${product.variant_combination_prices.length} variant combinations`);
      const combinationPrices = product.variant_combination_prices
        .map(variant => variant.monthly_price || 0)
        .filter(price => price > 0);
      
      if (combinationPrices.length > 0) {
        const minCombinationPrice = Math.min(...combinationPrices);
        console.log(`Minimum combination price found: ${minCombinationPrice}`);
        if (minCombinationPrice > 0 && (minPrice === 0 || minCombinationPrice < minPrice)) {
          minPrice = minCombinationPrice;
        }
      }
    }
    
    return minPrice;
  };
  
  const monthlyPrice = getMinimumMonthlyPrice();
  const hasPrice = monthlyPrice > 0;
  const imageUrl = product.image_url || product.imageUrl || "/placeholder.svg";
  
  // Get appropriate category label
  const getCategoryLabel = (category: string | undefined) => {
    if (!category) return "Autre";
    
    const categoryMap: Record<string, string> = {
      laptop: "Ordinateur portable",
      desktop: "Ordinateur fixe",
      tablet: "Tablette",
      smartphone: "Smartphone",
      monitor: "Écran",
      printer: "Imprimante",
      accessories: "Accessoire"
    };
    
    return categoryMap[category] || "Autre";
  };

  // Méthode pour compter le nombre de variantes EXISTANTES (configurations réelles)
  const countExistingVariants = (): number => {
    // 1. Si le produit a un nombre de variantes défini par le serveur, l'utiliser
    if (product.variants_count !== undefined && product.variants_count > 0) {
      return product.variants_count;
    }
    
    // 2. Si le produit a des combinaisons de prix de variantes, compter celles-ci
    if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      return product.variant_combination_prices.length;
    }
    
    // 3. Si le produit a des variantes directes, compter celles-ci
    if (product.variants && product.variants.length > 0) {
      return product.variants.length;
    }
    
    // 4. Si le produit a des attributs de variation mais pas de variantes/combinaisons existantes,
    // nous ne comptons pas les variantes théoriques, mais retournons 0 car aucune configuration n'existe
    return 0;
  };

  // Déterminer si le produit a des variantes
  const hasVariants = (): boolean => {
    // Les conditions pour qu'un produit ait des variantes
    const result = 
      (product.is_parent === true) || 
      (product.variant_combination_prices && product.variant_combination_prices.length > 0) || 
      (product.variation_attributes && Object.keys(product.variation_attributes || {}).length > 0) ||
      (product.variants && product.variants.length > 0);
    
    console.log(`Product ${product.name}: hasVariants = ${result}`);
    console.log(`- is_parent: ${product.is_parent}`);
    console.log(`- has variant_combination_prices: ${product.variant_combination_prices?.length > 0}`);
    console.log(`- has variation_attributes: ${product.variation_attributes && Object.keys(product.variation_attributes || {}).length > 0}`);
    console.log(`- has variants: ${product.variants?.length > 0}`);
    
    return result;
  };
  
  const hasVariantsFlag = hasVariants();
  const variantsCount = hasVariantsFlag ? countExistingVariants() : 0;

  return (
    <Card 
      className="overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer h-full flex flex-col border shadow-sm rounded-xl"
      onClick={onClick}
    >
      <div className="relative pt-[100%] bg-white">
        <img 
          src={imageUrl} 
          alt={product.name} 
          className="absolute inset-0 object-contain w-full h-full p-5"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.svg";
          }}
        />
      </div>
      
      <CardContent className="flex-1 flex flex-col p-4">
        <div className="flex flex-wrap gap-2 mb-2">
          {product.category && (
            <Badge className="bg-indigo-500 text-white hover:bg-indigo-600 rounded-full font-normal text-xs">
              {getCategoryLabel(product.category)}
            </Badge>
          )}
          {brandLabel && (
            <Badge variant="outline" className="rounded-full font-normal text-gray-600 bg-gray-50 text-xs">
              {brandLabel}
            </Badge>
          )}
          
          <VariantIndicator 
            hasVariants={hasVariantsFlag} 
            variantsCount={variantsCount} 
          />
        </div>
        
        <h3 className="font-bold text-gray-900 text-sm mb-1 truncate">{product.name}</h3>
        
        <div className="mt-auto pt-2">
          {hasPrice ? (
            <div className="text-gray-700 text-sm">
              {hasVariantsFlag ? "À partir de " : ""}
              <span className="font-bold text-indigo-700">{formatCurrency(monthlyPrice)}</span>
              <span className="text-xs"> par mois</span>
            </div>
          ) : (
            <div className="text-gray-700 text-sm">
              <span className="font-medium text-indigo-600">Prix sur demande</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductGridCard;
