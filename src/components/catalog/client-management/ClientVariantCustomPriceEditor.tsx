import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProductVariantPrices } from "@/services/variantPriceService";
import { getClientCustomVariantPrices, upsertClientCustomVariantPrice } from "@/services/clientVariantPriceService";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import ClientVariantCombinationsManager from "./ClientVariantCombinationsManager";

interface ClientVariantCustomPriceEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  productId: string;
  variantPriceId: string;
  onSuccess?: () => void;
}

type PricingMode = 'margin' | 'direct';

export const ClientVariantCustomPriceEditor = ({
  open,
  onOpenChange,
  clientId,
  productId,
  variantPriceId,
  onSuccess
}: ClientVariantCustomPriceEditorProps) => {
  const [pricingMode, setPricingMode] = useState<PricingMode>('margin');
  const [marginRate, setMarginRate] = useState<number>(0);
  const [directPrice, setDirectPrice] = useState<number>(0);
  const [customPurchasePrice, setCustomPurchasePrice] = useState<number>(0);
  const [customMonthlyPrice, setCustomMonthlyPrice] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const queryClient = useQueryClient();

  // Récupérer les détails de la variante
  const { data: variantPrices } = useQuery({
    queryKey: ['product-variants', productId],
    queryFn: () => getProductVariantPrices(productId),
    enabled: open && !!productId,
  });

  // Récupérer le prix personnalisé existant
  const { data: customVariantPrices } = useQuery({
    queryKey: ['client-custom-variant-prices', clientId, productId],
    queryFn: () => getClientCustomVariantPrices(clientId, productId),
    enabled: open && !!clientId && !!productId,
  });

  const variant = variantPrices?.find(v => v.id === variantPriceId);
  const existingCustomPrice = customVariantPrices?.find(cp => cp.variant_price_id === variantPriceId);

  // Initialiser les valeurs
  useEffect(() => {
    if (!variant) return;

    if (existingCustomPrice) {
      // Charger les valeurs existantes
      if (existingCustomPrice.margin_rate) {
        setPricingMode('margin');
        setMarginRate(existingCustomPrice.margin_rate);
      } else {
        setPricingMode('direct');
        setDirectPrice(existingCustomPrice.custom_purchase_price || 0);
      }
      setCustomPurchasePrice(existingCustomPrice.custom_purchase_price || 0);
      setCustomMonthlyPrice(existingCustomPrice.custom_monthly_price || 0);
      setNotes(existingCustomPrice.notes || '');
    } else {
      // Valeurs par défaut basées sur la variante standard
      setCustomPurchasePrice(variant.price || 0);
      setCustomMonthlyPrice(variant.monthly_price || 0);
      setMarginRate(0);
      setDirectPrice(variant.price || 0);
      setNotes('');
    }
  }, [variant, existingCustomPrice]);

  // Mutation pour sauvegarder
  const saveMutation = useMutation({
    mutationFn: upsertClientCustomVariantPrice,
    onSuccess: () => {
      toast.success("Prix personnalisé sauvegardé avec succès");
      queryClient.invalidateQueries({ queryKey: ['client-custom-variant-prices'] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la sauvegarde: ${error.message}`);
    },
  });

  const calculatePreviewPrice = () => {
    if (!variant) return { customPrice: 0, monthlyPrice: 0 };

    if (pricingMode === 'margin') {
      const discountedPrice = variant.price * (1 - marginRate / 100);
      const discountedMonthly = variant.monthly_price * (1 - marginRate / 100);
      return {
        customPrice: discountedPrice,
        monthlyPrice: discountedMonthly
      };
    } else {
      return {
        customPrice: directPrice,
        monthlyPrice: customMonthlyPrice
      };
    }
  };

  const handleSave = () => {
    if (!variant) return;

    const preview = calculatePreviewPrice();
    
    // Validation
    if (preview.customPrice <= 0) {
      toast.error("Le prix personnalisé doit être supérieur à 0");
      return;
    }

    if (pricingMode === 'margin' && (marginRate < 0 || marginRate > 100)) {
      toast.error("Le taux de remise doit être entre 0 et 100%");
      return;
    }

    const data = {
      client_id: clientId,
      variant_price_id: variantPriceId,
      custom_purchase_price: preview.customPrice,
      custom_monthly_price: preview.monthlyPrice,
      margin_rate: pricingMode === 'margin' ? marginRate : null,
      notes: notes.trim() || null,
    };

    saveMutation.mutate(data);
  };

  if (!variant) {
    return null;
  }

  const preview = calculatePreviewPrice();
  const standardPrice = variant.price;
  const savings = standardPrice - preview.customPrice;
  const savingsPercentage = standardPrice > 0 ? (savings / standardPrice) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Prix personnalisé pour variante</DialogTitle>
          <DialogDescription>
            Configurez un prix personnalisé pour cette variante
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations de la variante */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="font-medium mb-2">Variante sélectionnée</div>
            <div className="flex flex-wrap gap-2 mb-3">
              {variant.attributes && Object.entries(variant.attributes).map(([key, value]) => (
                <Badge key={key} variant="outline">
                  {key}: {String(value)}
                </Badge>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Prix standard</div>
                <div className="font-semibold">{formatCurrency(variant.price)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Mensualité standard</div>
                <div className="font-semibold">{formatCurrency(variant.monthly_price)}/mois</div>
              </div>
            </div>
          </div>

          {/* Mode de tarification */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Mode de tarification</Label>
            <RadioGroup value={pricingMode} onValueChange={(value: PricingMode) => setPricingMode(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="margin" id="margin" />
                <Label htmlFor="margin">Appliquer un pourcentage de remise</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="direct" id="direct" />
                <Label htmlFor="direct">Définir un prix fixe</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Configuration du prix */}
          {pricingMode === 'margin' ? (
            <div className="space-y-2">
              <Label htmlFor="marginRate">Pourcentage de remise (%)</Label>
              <Input
                id="marginRate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={marginRate}
                onChange={(e) => setMarginRate(parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
              <div className="text-sm text-muted-foreground">
                Une remise de {marginRate}% sera appliquée au prix standard
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="directPrice">Prix d'achat personnalisé (€)</Label>
                <Input
                  id="directPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={directPrice}
                  onChange={(e) => setDirectPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customMonthlyPrice">Mensualité personnalisée (€)</Label>
                <Input
                  id="customMonthlyPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={customMonthlyPrice}
                  onChange={(e) => setCustomMonthlyPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ajoutez des notes sur ce prix personnalisé..."
              rows={3}
            />
          </div>

          {/* Aperçu du prix */}
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="font-medium mb-3">Aperçu du prix personnalisé</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Prix personnalisé</div>
                <div className="text-lg font-semibold text-primary">
                  {formatCurrency(preview.customPrice)}
                </div>
                <div className="text-muted-foreground">
                  {formatCurrency(preview.monthlyPrice)}/mois
                </div>
              </div>
              
              <div>
                <div className="text-muted-foreground">Prix standard</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(standardPrice)}
                </div>
                <div className="text-muted-foreground">
                  {formatCurrency(variant.monthly_price)}/mois
                </div>
              </div>
              
              <div>
                <div className="text-muted-foreground">Économie</div>
                <div className="text-lg font-semibold text-green-600">
                  {formatCurrency(savings)}
                </div>
                <div className="text-muted-foreground">
                  {savingsPercentage.toFixed(1)}% d'économie
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saveMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </div>
        </div>

        {/* Add the Client Variant Combinations Manager */}
        <div className="mt-6 pt-6 border-t">
          <ClientVariantCombinationsManager
            clientId={clientId}
            productId={productId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};