import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Trash2, Settings, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getClientCustomVariantCombinations,
  generateAllCombinations,
  createAllCombinations,
  updateClientCustomVariantCombination,
  deleteClientCustomVariantCombination,
  ClientCustomVariantCombination
} from "@/services/clientCustomVariantCombinationsService";
import { getClientCustomVariants } from "@/services/clientCustomVariantService";
import { getProductVariantPrices } from "@/services/variantPriceService";
import { formatCurrency } from "@/utils/formatters";

interface ClientVariantCombinationsManagerProps {
  clientId: string;
  productId: string;
  productAttributes?: Record<string, string[]>;
}

const ClientVariantCombinationsManager: React.FC<ClientVariantCombinationsManagerProps> = ({
  clientId,
  productId,
  productAttributes = {}
}) => {
  const [editingCombination, setEditingCombination] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    custom_purchase_price?: number;
    custom_monthly_price?: number;
    margin_rate?: number;
    notes?: string;
    is_available: boolean;
  }>({
    is_available: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing combinations
  const { data: combinations = [], isLoading } = useQuery({
    queryKey: ['client-custom-variant-combinations', clientId, productId],
    queryFn: () => getClientCustomVariantCombinations(clientId, productId)
  });

  // Fetch custom variants to get custom attributes
  const { data: customVariants = [] } = useQuery({
    queryKey: ['client-custom-variants', clientId, productId],
    queryFn: () => getClientCustomVariants(clientId, productId)
  });

  // Fetch product variant prices to get product attributes
  const { data: variantPrices = [] } = useQuery({
    queryKey: ['product-variant-prices', productId],
    queryFn: () => getProductVariantPrices(productId)
  });

  // Generate all combinations mutation
  const generateCombinationsMutation = useMutation({
    mutationFn: async () => {
      // Extract custom attributes from custom variants
      const customAttributes: Record<string, string[]> = {};
      
      customVariants.forEach(variant => {
        Object.entries(variant.attributes).forEach(([key, value]) => {
          if (!customAttributes[key]) {
            customAttributes[key] = [];
          }
          
          // Handle split values (e.g., "AZERTY, QWERTY")
          const valueStr = String(value);
          const splitValues = valueStr.includes(',') 
            ? valueStr.split(',').map(v => v.trim()).filter(v => v.length > 0)
            : [valueStr];
          
          splitValues.forEach(splitValue => {
            if (!customAttributes[key].includes(splitValue)) {
              customAttributes[key].push(splitValue);
            }
          });
        });
      });

      // Extract product attributes from variant prices
      const productAttrs: Record<string, string[]> = {};
      variantPrices.forEach(variant => {
        Object.entries(variant.attributes).forEach(([key, value]) => {
          if (!productAttrs[key]) {
            productAttrs[key] = [];
          }
          if (!productAttrs[key].includes(String(value))) {
            productAttrs[key].push(String(value));
          }
        });
      });

      // Merge with provided product attributes
      const mergedProductAttrs = { ...productAttrs, ...productAttributes };
      
      // Generate all possible combinations
      const allCombinations = generateAllCombinations(mergedProductAttrs, customAttributes);
      
      if (allCombinations.length === 0) {
        throw new Error("Aucune combinaison possible à générer. Vérifiez que des attributs sont définis.");
      }

      // Create combinations in database
      await createAllCombinations(clientId, productId, allCombinations);
      
      return allCombinations.length;
    },
    onSuccess: (count) => {
      toast({
        title: "Combinaisons générées",
        description: `${count} combinaisons ont été créées avec succès.`,
      });
      queryClient.invalidateQueries({
        queryKey: ['client-custom-variant-combinations', clientId, productId]
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de générer les combinaisons.",
        variant: "destructive",
      });
    }
  });

  // Update combination mutation
  const updateCombinationMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      updateClientCustomVariantCombination(id, updates),
    onSuccess: () => {
      toast({
        title: "Combinaison mise à jour",
        description: "La combinaison a été mise à jour avec succès.",
      });
      queryClient.invalidateQueries({
        queryKey: ['client-custom-variant-combinations', clientId, productId]
      });
      setEditingCombination(null);
      setEditForm({ is_available: true });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la combinaison.",
        variant: "destructive",
      });
    }
  });

  // Delete combination mutation
  const deleteCombinationMutation = useMutation({
    mutationFn: deleteClientCustomVariantCombination,
    onSuccess: () => {
      toast({
        title: "Combinaison supprimée",
        description: "La combinaison a été supprimée avec succès.",
      });
      queryClient.invalidateQueries({
        queryKey: ['client-custom-variant-combinations', clientId, productId]
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la combinaison.",
        variant: "destructive",
      });
    }
  });

  const handleEdit = (combination: ClientCustomVariantCombination) => {
    setEditingCombination(combination.id);
    setEditForm({
      custom_purchase_price: combination.custom_purchase_price || undefined,
      custom_monthly_price: combination.custom_monthly_price || undefined,
      margin_rate: combination.margin_rate || undefined,
      notes: combination.notes || "",
      is_available: combination.is_available
    });
  };

  const handleSave = () => {
    if (!editingCombination) return;
    
    updateCombinationMutation.mutate({
      id: editingCombination,
      updates: editForm
    });
  };

  const handleCancel = () => {
    setEditingCombination(null);
    setEditForm({ is_available: true });
  };

  const formatAttributes = (attributes: Record<string, string>) => {
    return Object.entries(attributes)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
  };

  if (isLoading) {
    return <div>Chargement des combinaisons...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Combinaisons de variantes personnalisées
        </CardTitle>
        <div className="flex gap-2">
          <Button
            onClick={() => generateCombinationsMutation.mutate()}
            disabled={generateCombinationsMutation.isPending}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {generateCombinationsMutation.isPending ? "Génération..." : "Générer toutes les combinaisons"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {combinations.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucune combinaison définie. Cliquez sur "Générer toutes les combinaisons" pour commencer.
            </p>
          ) : (
            <div className="space-y-2">
              {combinations.map((combination) => (
                <div
                  key={combination.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">
                        {formatAttributes(combination.attributes)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Prix d'achat: {combination.custom_purchase_price ? formatCurrency(combination.custom_purchase_price) : "Non défini"} | 
                        Prix mensuel: {combination.custom_monthly_price ? formatCurrency(combination.custom_monthly_price) : "Non défini"}
                        {combination.margin_rate && ` | Marge: ${combination.margin_rate}%`}
                      </div>
                      {!combination.is_available && (
                        <div className="text-sm text-red-600 font-medium">Non disponible</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(combination)}
                        disabled={editingCombination === combination.id}
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteCombinationMutation.mutate(combination.id)}
                        disabled={deleteCombinationMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {editingCombination === combination.id && (
                    <div className="border-t pt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="custom_purchase_price">Prix d'achat personnalisé</Label>
                          <Input
                            id="custom_purchase_price"
                            type="number"
                            step="0.01"
                            value={editForm.custom_purchase_price || ""}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              custom_purchase_price: e.target.value ? parseFloat(e.target.value) : undefined
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="custom_monthly_price">Prix mensuel personnalisé</Label>
                          <Input
                            id="custom_monthly_price"
                            type="number"
                            step="0.01"
                            value={editForm.custom_monthly_price || ""}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              custom_monthly_price: e.target.value ? parseFloat(e.target.value) : undefined
                            })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="margin_rate">Taux de marge (%)</Label>
                        <Input
                          id="margin_rate"
                          type="number"
                          step="0.01"
                          value={editForm.margin_rate || ""}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            margin_rate: e.target.value ? parseFloat(e.target.value) : undefined
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          value={editForm.notes || ""}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            notes: e.target.value
                          })}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is_available"
                          checked={editForm.is_available}
                          onCheckedChange={(checked) => setEditForm({
                            ...editForm,
                            is_available: checked
                          })}
                        />
                        <Label htmlFor="is_available">Disponible</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSave}
                          disabled={updateCombinationMutation.isPending}
                        >
                          {updateCombinationMutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleCancel}
                        >
                          Annuler
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientVariantCombinationsManager;