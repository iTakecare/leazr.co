
import React from "react";
import { Product } from "@/types/catalog";
import AccordionProductList from "@/components/catalog/AccordionProductList";
import ProductGrid from "@/components/catalog/ProductGrid";
import { useAuth } from "@/hooks/auth/useAuth";

interface CatalogContentProps {
  products: Product[];
  isLoading: boolean;
  error: any;
  viewMode: "grid" | "accordion";
  groupingOption: "model" | "brand";
  onProductDeleted: (productId: string) => Promise<void>;
}

const CatalogContent: React.FC<CatalogContentProps> = ({
  products,
  isLoading,
  error,
  viewMode,
  groupingOption,
  onProductDeleted
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin'; // Vérifie si l'utilisateur est admin
  
  // Filtre les produits admin_only si l'utilisateur n'est pas admin
  const filteredProducts = isAdmin 
    ? products 
    : products.filter(p => !p.admin_only);

  // Debug log to check products data
  console.log("CatalogContent: Products count:", filteredProducts.length);
  console.log("CatalogContent: Products with variants:", filteredProducts.filter(p => 
    p.is_parent || 
    (p.variant_combination_prices && p.variant_combination_prices.length > 0) ||
    (p.variation_attributes && Object.keys(p.variation_attributes || {}).length > 0)
  ).length);

  // Log specific details for each product to help debugging
  filteredProducts.forEach(p => {
    console.log(`CatalogContent: Product "${p.name}" (${p.id}):`, {
      isParent: p.is_parent,
      hasVariantPrices: p.variant_combination_prices?.length > 0,
      variantPricesCount: p.variant_combination_prices?.length || 0,
      hasVariationAttrs: p.variation_attributes && Object.keys(p.variation_attributes || {}).length > 0,
      variationAttrs: p.variation_attributes,
      adminOnly: p.admin_only
    });
  });

  if (error) {
    return (
      <div className="text-center p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
        Une erreur s'est produite lors du chargement des produits. Veuillez réessayer.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 rounded-md bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      {viewMode === "accordion" ? (
        <AccordionProductList 
          products={filteredProducts} 
          onProductDeleted={onProductDeleted} 
          groupingOption={groupingOption} 
        />
      ) : (
        <ProductGrid products={filteredProducts} />
      )}
    </>
  );
};

export default CatalogContent;
