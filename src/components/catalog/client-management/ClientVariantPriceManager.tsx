import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { getProductVariantPrices } from "@/services/variantPriceService";
import { getClientCustomVariantPrices } from "@/services/clientVariantPriceService";
import { ClientVariantCustomPriceEditor } from "./ClientVariantCustomPriceEditor";
import { formatCurrency } from "@/lib/utils";
import { Pencil, Plus } from "lucide-react";

interface ClientVariantPriceManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  productId: string;
  productName: string;
}

export const ClientVariantPriceManager = ({
  open,
  onOpenChange,
  clientId,
  productId,
  productName
}: ClientVariantPriceManagerProps) => {
  const [editingVariant, setEditingVariant] = useState<string | null>(null);

  // Récupérer les variantes du produit
  const { data: variantPrices, isLoading: variantsLoading } = useQuery({
    queryKey: ['product-variants', productId],
    queryFn: () => getProductVariantPrices(productId),
    enabled: open && !!productId,
  });

  // Récupérer les prix personnalisés existants
  const { data: customVariantPrices, refetch: refetchCustomPrices } = useQuery({
    queryKey: ['client-custom-variant-prices', clientId, productId],
    queryFn: () => getClientCustomVariantPrices(clientId, productId),
    enabled: open && !!clientId && !!productId,
  });

  const getCustomPriceForVariant = (variantId: string) => {
    return customVariantPrices?.find(cp => cp.variant_price_id === variantId);
  };

  const handleVariantSaved = () => {
    refetchCustomPrices();
    setEditingVariant(null);
  };

  if (variantsLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Gestion des prix des variantes</DialogTitle>
            <DialogDescription>Chargement des variantes...</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  if (!variantPrices || variantPrices.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Gestion des prix des variantes</DialogTitle>
            <DialogDescription>
              Le produit "{productName}" n'a pas de variantes configurées.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Pour gérer les prix des variantes, vous devez d'abord configurer les variantes du produit dans le catalogue principal.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestion des prix des variantes</DialogTitle>
            <DialogDescription>
              Configurez des prix personnalisés pour les variantes du produit "{productName}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {variantPrices.map((variant) => {
              const customPrice = getCustomPriceForVariant(variant.id);
              const hasCustomPrice = !!customPrice;

              return (
                <Card key={variant.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">
                          Variante
                          {hasCustomPrice && (
                            <Badge variant="secondary" className="ml-2">
                              Prix personnalisé
                            </Badge>
                          )}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2">
                          {variant.attributes && Object.entries(variant.attributes).map(([key, value]) => (
                            <Badge key={key} variant="outline">
                              {key}: {String(value)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingVariant(variant.id)}
                      >
                        {hasCustomPrice ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        {hasCustomPrice ? 'Modifier' : 'Ajouter prix'}
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-muted-foreground">Prix standard</div>
                        <div className="text-lg font-semibold">
                          {formatCurrency(variant.monthly_price)}/mois
                        </div>
                      </div>
                      
                      {hasCustomPrice && (
                        <div>
                          <div className="font-medium text-muted-foreground">Prix personnalisé</div>
                          <div className="text-lg font-semibold text-primary">
                            {customPrice.custom_monthly_price ? `${formatCurrency(customPrice.custom_monthly_price)}/mois` : 'Non défini'}
                          </div>
                        </div>
                      )}
                      
                      {hasCustomPrice && customPrice.custom_monthly_price && variant.monthly_price && (
                        <div>
                          <div className="font-medium text-muted-foreground">Économie</div>
                          <div className="text-lg font-semibold text-green-600">
                            {formatCurrency(variant.monthly_price - customPrice.custom_monthly_price)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {(((variant.monthly_price - customPrice.custom_monthly_price) / variant.monthly_price) * 100).toFixed(1)}% d'économie
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {hasCustomPrice && customPrice.notes && (
                      <div className="mt-3 p-3 bg-muted rounded-md">
                        <div className="text-sm font-medium text-muted-foreground">Notes</div>
                        <div className="text-sm">{customPrice.notes}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {editingVariant && (
        <ClientVariantCustomPriceEditor
          open={!!editingVariant}
          onOpenChange={(open) => !open && setEditingVariant(null)}
          clientId={clientId}
          productId={productId}
          variantPriceId={editingVariant}
          onSuccess={handleVariantSaved}
        />
      )}
    </>
  );
};