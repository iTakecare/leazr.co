
import React from "react";
import { Product } from "@/types/catalog";
import AccordionProductList from "@/components/catalog/AccordionProductList";
import ProductGrid from "@/components/catalog/ProductGrid";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  // Récupérer les traductions des catégories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("name, translation");
      
      if (error) throw error;
      return data || [];
    }
  });

  // Créer un map des traductions
  const categoryTranslations = React.useMemo(() => {
    return categories.reduce((acc, cat) => ({
      ...acc,
      [cat.name]: cat.translation
    }), {} as Record<string, string>);
  }, [categories]);

  // Debug log to check products data
  console.log("CatalogContent: Products count:", products.length);
  console.log("CatalogContent: Products with variants:", products.filter(p => 
    p.is_parent || 
    (p.variant_combination_prices && p.variant_combination_prices.length > 0) ||
    (p.variation_attributes && Object.keys(p.variation_attributes || {}).length > 0)
  ).length);

  // Fonction pour obtenir la traduction d'une catégorie
  const getCategoryTranslation = (categoryName: string): string => {
    return categoryTranslations[categoryName] || categoryName;
  };

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
          products={products.map(product => ({
            ...product,
            category: getCategoryTranslation(product.category || '')
          }))} 
          onProductDeleted={onProductDeleted} 
          groupingOption={groupingOption} 
        />
      ) : (
        <ProductGrid products={products.map(product => ({
          ...product,
          category: getCategoryTranslation(product.category || '')
        }))} />
      )}
    </>
  );
};

export default CatalogContent;
