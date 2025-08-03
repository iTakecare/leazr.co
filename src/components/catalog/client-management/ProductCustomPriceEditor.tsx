import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calculator, Euro, Percent } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProductCustomPriceEditorProps {
  clientId: string;
  productId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const ProductCustomPriceEditor: React.FC<ProductCustomPriceEditorProps> = ({
  clientId,
  productId,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [pricingMode, setPricingMode] = useState<'margin' | 'direct'>('margin');
  const [marginRate, setMarginRate] = useState<string>('');
  const [directPrice, setDirectPrice] = useState<string>('');
  const [customPurchasePrice, setCustomPurchasePrice] = useState<string>('');
  const { toast } = useToast();

  // Récupérer les données du produit et prix actuel
  const { data: productData, isLoading } = useQuery({
    queryKey: ['product-custom-price-editor', productId, clientId],
    queryFn: async () => {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select(`
          *,
          brands (name, translation),
          categories (name, translation)
        `)
        .eq('id', productId)
        .single();

      if (productError) throw productError;

      const { data: customPrice, error: priceError } = await supabase
        .from('client_custom_prices')
        .select('*')
        .eq('client_id', clientId)
        .eq('product_id', productId)
        .maybeSingle();

      if (priceError) throw priceError;

      return { product, customPrice };
    },
    enabled: open,
  });

  // Initialiser les valeurs quand les données sont chargées
  useEffect(() => {
    if (productData?.customPrice) {
      const { margin_rate, negotiated_monthly_price, custom_purchase_price } = productData.customPrice;
      
      if (negotiated_monthly_price) {
        setPricingMode('direct');
        setDirectPrice(negotiated_monthly_price.toString());
      } else if (margin_rate) {
        setPricingMode('margin');
        setMarginRate(margin_rate.toString());
      }
      
      if (custom_purchase_price) {
        setCustomPurchasePrice(custom_purchase_price.toString());
      }
    } else {
      // Valeurs par défaut pour un nouveau prix
      setPricingMode('margin');
      setMarginRate('15');
      setDirectPrice('');
      setCustomPurchasePrice('');
    }
  }, [productData]);

  // Mutation pour sauvegarder le prix personnalisé
  const savePriceMutation = useMutation({
    mutationFn: async () => {
      const purchasePrice = customPurchasePrice ? parseFloat(customPurchasePrice) : productData?.product.price;
      const margin = marginRate ? parseFloat(marginRate) : null;
      const negotiatedPrice = directPrice ? parseFloat(directPrice) : null;

      // Validation
      if (pricingMode === 'margin' && (!margin || margin < 0)) {
        throw new Error('Le taux de marge doit être positif');
      }
      
      if (pricingMode === 'direct' && (!negotiatedPrice || negotiatedPrice <= 0)) {
        throw new Error('Le prix direct doit être positif');
      }

      if (purchasePrice && negotiatedPrice && negotiatedPrice < purchasePrice) {
        throw new Error('Le prix de vente ne peut pas être inférieur au prix d\'achat');
      }

      const priceData = {
        client_id: clientId,
        product_id: productId,
        margin_rate: pricingMode === 'margin' ? margin : null,
        negotiated_monthly_price: pricingMode === 'direct' ? negotiatedPrice : null,
        custom_purchase_price: customPurchasePrice ? parseFloat(customPurchasePrice) : null,
      };

      if (productData?.customPrice) {
        // Mise à jour
        const { error } = await supabase
          .from('client_custom_prices')
          .update(priceData)
          .eq('id', productData.customPrice.id);
        
        if (error) throw error;
      } else {
        // Création
        const { error } = await supabase
          .from('client_custom_prices')
          .insert(priceData);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Prix sauvegardé",
        description: "Le prix personnalisé a été mis à jour avec succès.",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const calculatePreviewPrice = () => {
    const basePrice = customPurchasePrice 
      ? parseFloat(customPurchasePrice) 
      : productData?.product.price || 0;

    if (pricingMode === 'margin' && marginRate) {
      const margin = parseFloat(marginRate) / 100;
      return basePrice * (1 + margin);
    } else if (pricingMode === 'direct' && directPrice) {
      return parseFloat(directPrice);
    }
    
    return productData?.product.monthly_price || 0;
  };

  const previewPrice = calculatePreviewPrice();
  const standardPrice = productData?.product.monthly_price || 0;
  const savings = standardPrice - previewPrice;
  const savingsPercentage = standardPrice > 0 ? (savings / standardPrice) * 100 : 0;

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="text-center py-8">Chargement...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configuration du prix personnalisé</DialogTitle>
          <DialogDescription>
            {productData?.product.name} - {productData?.product.brands?.translation || productData?.product.brands?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations produit */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Prix d'achat</Label>
                  <div className="font-medium">
                    {productData?.product.price 
                      ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(productData.product.price)
                      : 'Non défini'
                    }
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Prix standard</Label>
                  <div className="font-medium">
                    {standardPrice 
                      ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(standardPrice)
                      : 'Non défini'
                    }
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Stock</Label>
                  <div className="font-medium">{productData?.product.stock || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mode de calcul */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Mode de calcul</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={pricingMode === 'margin'}
                    onCheckedChange={(checked) => setPricingMode(checked ? 'margin' : 'direct')}
                  />
                  <Label>
                    {pricingMode === 'margin' ? 'Taux de marge' : 'Prix direct'}
                  </Label>
                </div>
              </div>
            </div>

            {/* Prix d'achat personnalisé */}
            <div className="space-y-2">
              <Label>Prix d'achat personnalisé (optionnel)</Label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  placeholder={productData?.product.price?.toString() || "0"}
                  value={customPurchasePrice}
                  onChange={(e) => setCustomPurchasePrice(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {pricingMode === 'margin' ? (
              <div className="space-y-2">
                <Label>Taux de marge (%)</Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="15"
                    value={marginRate}
                    onChange={(e) => setMarginRate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Prix mensuel direct</Label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={directPrice}
                    onChange={(e) => setDirectPrice(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Prévisualisation */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="h-4 w-4" />
                <Label>Prévisualisation</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Prix personnalisé</div>
                  <div className="text-lg font-bold">
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(previewPrice)}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-muted-foreground">Économie</div>
                  <div className={`text-lg font-bold ${savings > 0 ? 'text-green-600' : savings < 0 ? 'text-red-600' : ''}`}>
                    {savings > 0 ? '-' : savings < 0 ? '+' : ''}
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Math.abs(savings))}
                    {savingsPercentage !== 0 && (
                      <span className="text-sm ml-1">
                        ({Math.abs(savingsPercentage).toFixed(1)}%)
                      </span>
                    )}
                    {savings > 0 && <Badge variant="secondary" className="ml-2 text-green-600">Économie</Badge>}
                    {savings < 0 && <Badge variant="secondary" className="ml-2 text-red-600">Surcoût</Badge>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button 
              onClick={() => savePriceMutation.mutate()}
              disabled={savePriceMutation.isPending}
            >
              {savePriceMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};