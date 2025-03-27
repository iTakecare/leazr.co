
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Product } from "@/types/catalog";
import { formatCurrency } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";
import VariantIndicator from "@/components/ui/product/VariantIndicator";
import { Leaf } from "lucide-react";

interface ProductGridCardProps {
  product: Product;
  onClick: () => void;
}

// Fonction utilitaire pour calculer l'économie de CO2 selon la catégorie du produit
const getCO2Savings = (category: string | undefined): number => {
  if (!category) return 0;
  
  switch (category.toLowerCase()) {
    case "laptop":
    case "desktop":
      return 170;
    case "smartphone":
      return 45;
    case "tablet":
      return 87;
    default:
      return 0;
  }
};

const ProductGridCard: React.FC<ProductGridCardProps> = ({ product, onClick }) => {
  // Skip rendering if this is a variant
  if (product.is_variation || product.parent_id) {
    return null;
  }

  const brandLabel = product.brand || "Generic";
  
  // Determine minimum monthly price considering variants
  const getMinimumMonthlyPrice = (): number => {
    let minPrice = product.monthly_price || 0;
    
    // Priorité 1: Vérifier les prix dans variant_combination_prices (table product_variant_prices)
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
          console.log(`Using combination price: ${minPrice}`);
        }
      }
    }
    
    // Priorité 2: Vérifier les variantes uniquement si nous n'avons pas de prix de combinaison
    else if (product.variants && product.variants.length > 0) {
      console.log(`Product ${product.name} has ${product.variants.length} variants`);
      const variantPrices = product.variants
        .map(variant => variant.monthly_price || 0)
        .filter(price => price > 0);
      
      if (variantPrices.length > 0) {
        const minVariantPrice = Math.min(...variantPrices);
        console.log(`Minimum variant price found: ${minVariantPrice}`);
        if (minVariantPrice > 0 && (minPrice === 0 || minVariantPrice < minPrice)) {
          minPrice = minVariantPrice;
          console.log(`Using variant price: ${minPrice}`);
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
    // 1. Vérifier si le produit a des combinaisons de prix de variantes (table product_variant_prices)
    if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      console.log(`${product.name} a ${product.variant_combination_prices.length} combinaisons de prix de variantes`);
      return product.variant_combination_prices.length;
    }
    
    // 2. Si le produit a un nombre de variantes défini par le serveur, l'utiliser
    if (product.variants_count !== undefined && product.variants_count > 0) {
      return product.variants_count;
    }
    
    // 3. Si le produit a des variantes directes, compter celles-ci
    if (product.variants && product.variants.length > 0) {
      return product.variants.length;
    }
    
    // Si aucune variante réelle n'est trouvée, retourner 0
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
  
  // Calculer l'économie de CO2
  const co2Savings = getCO2Savings(product.category);

  return (
    <Card 
      className="overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer h-full flex flex-col border shadow-sm rounded-xl hover:border-[#4ab6c4]/30"
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
        
        {co2Savings > 0 && (
          <div className="absolute top-2 right-2 z-10">
            <div className="bg-[#38b77c] text-white text-xs px-2 py-1 rounded-full flex items-center shadow-md transform rotate-[15deg] animate-pulse">
              <Leaf className="h-3 w-3 mr-1" />
              <span>{co2Savings} kg CO2 économisés</span>
            </div>
          </div>
        )}
      </div>
      
      <CardContent className="flex-1 flex flex-col p-4">
        <div className="flex flex-wrap gap-2 mb-2">
          {product.category && (
            <Badge className="bg-[#33638e] text-white hover:bg-[#33638e]/90 rounded-full font-normal text-xs">
              {getCategoryLabel(product.category)}
            </Badge>
          )}
          {brandLabel && (
            <Badge variant="outline" className="rounded-full font-normal text-gray-600 bg-gray-50 text-xs border-[#4ab6c4]/20">
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
              <span className="font-bold text-[#4ab6c4]">{formatCurrency(monthlyPrice)}</span>
              <span className="text-xs"> par mois</span>
            </div>
          ) : (
            <div className="text-gray-700 text-sm">
              <span className="font-medium text-[#33638e]">Prix sur demande</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductGridCard;
