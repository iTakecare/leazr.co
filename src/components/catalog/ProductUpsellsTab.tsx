import { useState } from "react";
import { Product } from "@/types/catalog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { UpsellSelectedList } from "./UpsellSelectedList";
import { UpsellProductPicker } from "./UpsellProductPicker";
import { useProductUpsells } from "@/hooks/products/useProductUpsells";

interface ProductUpsellsTabProps {
  product: Product;
}

export const ProductUpsellsTab = ({ product }: ProductUpsellsTabProps) => {
  const { data: manualUpsells = [], isLoading: isLoadingManual } = useProductUpsells(product.id);

  // Construire le Set des produits déjà sélectionnés
  const manualUpsellProductIds = new Set(manualUpsells.map(u => u.upsell_product_id));

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Configurez les produits complémentaires (upsells) qui seront suggérés sur la fiche de ce produit.
          Sélectionnez manuellement les produits à suggérer.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonne gauche : Upsells sélectionnés */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Upsells sélectionnés</h3>
          <UpsellSelectedList
            productId={product.id}
            manualUpsells={manualUpsells}
            isLoading={isLoadingManual}
          />
        </div>

        {/* Colonne droite : Catalogue pour sélection */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Ajouter des produits</h3>
          <UpsellProductPicker
            productId={product.id}
            currentProductId={product.id}
            alreadySelected={manualUpsellProductIds}
          />
        </div>
      </div>
    </div>
  );
};
