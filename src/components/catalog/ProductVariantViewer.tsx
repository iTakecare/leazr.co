import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Product, ProductAttributes } from "@/types/catalog";
import { findVariantCombinationPrice } from "@/services/variantPriceService";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/utils/formatters";

interface ProductVariantViewerProps {
  productId: string;
  selectedAttributes: ProductAttributes;
}

const ProductVariantViewer: React.FC<ProductVariantViewerProps> = ({
  productId,
  selectedAttributes,
}) => {
  const [variant, setVariant] = useState<Product | null>(null);

  const { data: variantPrice, isLoading, isError, error } = useQuery(
    ["variantPrice", productId, selectedAttributes],
    () => findVariantCombinationPrice(productId, selectedAttributes),
    {
      enabled: !!productId && Object.keys(selectedAttributes).length > 0,
    }
  );

  useEffect(() => {
    if (variantPrice) {
      setVariant({
        ...variantPrice,
        price: variantPrice.price,
        monthly_price: variantPrice.monthly_price,
      } as Product);
    } else {
      setVariant(null);
    }
  }, [variantPrice]);

  if (isLoading) {
    return <p>Chargement de la variante...</p>;
  }

  if (isError) {
    return <p>Error: {(error as Error).message}</p>;
  }

  if (!variant) {
    return <p>Aucune variante trouvée pour ces attributs.</p>;
  }

  return (
    <div>
      <Separator className="my-4" />
      <h3 className="text-lg font-semibold">Variante sélectionnée:</h3>
      <p>Prix: {formatCurrency(variant.price)}</p>
      <p>Mensualité: {formatCurrency(variant.monthly_price || 0)}</p>
      <Button>Ajouter au panier</Button>
    </div>
  );
};

export default ProductVariantViewer;
