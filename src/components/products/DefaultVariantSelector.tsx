import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Product, ProductAttributes } from '@/types/catalog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface DefaultVariantSelectorProps {
  product: Product;
  onUpdate: (product: Product) => void;
}

export const DefaultVariantSelector: React.FC<DefaultVariantSelectorProps> = ({
  product,
  onUpdate
}) => {
  const [selectedDefaults, setSelectedDefaults] = useState<ProductAttributes>(
    product.default_variant_attributes || {}
  );
  const [isSaving, setIsSaving] = useState(false);

  // Reset when product changes
  useEffect(() => {
    setSelectedDefaults(product.default_variant_attributes || {});
  }, [product.default_variant_attributes]);

  const handleAttributeChange = (attributeName: string, value: string) => {
    setSelectedDefaults(prev => ({
      ...prev,
      [attributeName]: value
    }));
  };

  const handleClearDefault = (attributeName: string) => {
    setSelectedDefaults(prev => {
      const newDefaults = { ...prev };
      delete newDefaults[attributeName];
      return newDefaults;
    });
  };

  const handleSave = async () => {
    if (!product?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({
          default_variant_attributes: Object.keys(selectedDefaults).length > 0 ? selectedDefaults : null
        })
        .eq('id', product.id);

      if (error) throw error;

      // Update the product in parent component
      onUpdate({
        ...product,
        default_variant_attributes: Object.keys(selectedDefaults).length > 0 ? selectedDefaults : undefined
      });

      toast.success('Variante par défaut sauvegardée');
    } catch (error) {
      console.error('Error saving default variant:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAll = () => {
    setSelectedDefaults({});
  };

  // Check if product has variation attributes
  if (!product?.variation_attributes || Object.keys(product.variation_attributes).length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Variante par défaut</CardTitle>
          <CardDescription>
            Ce produit n'a pas d'attributs de variation configurés.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const hasChanges = JSON.stringify(selectedDefaults) !== JSON.stringify(product.default_variant_attributes || {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Variante par défaut</CardTitle>
        <CardDescription>
          Sélectionnez la combinaison d'attributs qui sera pré-sélectionnée par défaut pour ce produit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(product.variation_attributes).map(([attributeName, availableValues]) => (
          <div key={attributeName} className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              {attributeName}
              {selectedDefaults[attributeName] && (
                <Badge variant="secondary" className="text-xs">
                  Par défaut
                </Badge>
              )}
            </label>
            <div className="flex gap-2">
              <Select
                value={selectedDefaults[attributeName] as string || ""}
                onValueChange={(value) => handleAttributeChange(attributeName, value)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Sélectionner une valeur par défaut..." />
                </SelectTrigger>
                <SelectContent>
                  {availableValues.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedDefaults[attributeName] && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleClearDefault(attributeName)}
                >
                  Effacer
                </Button>
              )}
            </div>
          </div>
        ))}

        {Object.keys(selectedDefaults).length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Configuration actuelle :</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(selectedDefaults).map(([attr, value]) => (
                <Badge key={attr} variant="outline">
                  {attr}: {String(value)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="flex-1"
          >
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
          {Object.keys(selectedDefaults).length > 0 && (
            <Button
              variant="outline"
              onClick={handleClearAll}
              disabled={isSaving}
            >
              Tout effacer
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};