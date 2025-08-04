import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, EyeOff, Eye, Settings, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

// Services
import { getProductVariantPrices } from "@/services/variantPriceService";
import { getClientCustomVariantPrices, hideVariantFromClient, showVariantForClient, getClientHiddenVariants } from "@/services/clientVariantPriceService";
import { getClientCustomVariants, deleteClientCustomVariant } from "@/services/clientCustomVariantService";
import {
  getClientCustomVariantCombinations,
  generateAllCombinations,
  createAllCombinations,
  updateClientCustomVariantCombination,
  deleteClientCustomVariantCombination,
  ClientCustomVariantCombination
} from "@/services/clientCustomVariantCombinationsService";

// Other components
import { ClientVariantCustomPriceEditor } from "./ClientVariantCustomPriceEditor";
import ClientCustomVariantEditor from "./ClientCustomVariantEditor";

interface ClientVariantPricingManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  productId: string;
  productName: string;
}

interface EditingCombination {
  id: string;
  custom_purchase_price?: number;
  custom_monthly_price?: number;
  margin_rate?: number;
  notes?: string;
  is_available: boolean;
}

export const ClientVariantPricingManager = ({
  open,
  onOpenChange,
  clientId,
  productId,
  productName
}: ClientVariantPricingManagerProps) => {
  const [editingVariant, setEditingVariant] = useState<string | null>(null);
  const [isCreatingCustomVariant, setIsCreatingCustomVariant] = useState(false);
  const [editingCustomVariant, setEditingCustomVariant] = useState<any>(null);
  const [editingCombination, setEditingCombination] = useState<EditingCombination | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all data
  const { data: variantPrices = [], isLoading: variantsLoading } = useQuery({
    queryKey: ['product-variants', productId],
    queryFn: () => getProductVariantPrices(productId),
    enabled: open && !!productId,
  });

  const { data: customVariantPrices = [], refetch: refetchCustomPrices } = useQuery({
    queryKey: ['client-custom-variant-prices', clientId, productId],
    queryFn: () => getClientCustomVariantPrices(clientId, productId),
    enabled: open && !!clientId && !!productId,
  });

  const { data: customVariants = [], refetch: refetchCustomVariants } = useQuery({
    queryKey: ['client-custom-variants', clientId, productId],
    queryFn: () => getClientCustomVariants(clientId, productId),
    enabled: open && !!clientId && !!productId,
  });

  const { data: hiddenVariants = [], refetch: refetchHiddenVariants } = useQuery({
    queryKey: ['client-hidden-variants', clientId],
    queryFn: () => getClientHiddenVariants(clientId),
    enabled: open && !!clientId,
  });

  const { data: combinations = [], isLoading: combinationsLoading } = useQuery({
    queryKey: ['client-custom-variant-combinations', clientId, productId],
    queryFn: () => getClientCustomVariantCombinations(clientId, productId),
    enabled: open && !!clientId && !!productId,
  });

  // Generate unified combinations list
  const unifiedCombinations = useMemo(() => {
    const standardCombinations = variantPrices.map(variant => {
      const customPrice = customVariantPrices.find(cp => cp.variant_price_id === variant.id);
      const isHidden = hiddenVariants.includes(variant.id);
      
      return {
        id: variant.id,
        type: 'standard' as const,
        attributes: variant.attributes,
        standardPrice: variant.monthly_price,
        customPrice: customPrice?.custom_monthly_price,
        savings: customPrice?.custom_monthly_price ? variant.monthly_price - customPrice.custom_monthly_price : 0,
        notes: customPrice?.notes,
        isHidden,
        hasCustomPrice: !!customPrice,
        combination: null
      };
    });

    const customCombinations = combinations.map(combination => ({
      id: combination.id,
      type: 'combination' as const,
      attributes: combination.attributes,
      standardPrice: null,
      customPrice: combination.custom_monthly_price,
      savings: 0,
      notes: combination.notes,
      isHidden: false,
      hasCustomPrice: !!combination.custom_monthly_price,
      combination
    }));

    return [...standardCombinations, ...customCombinations];
  }, [variantPrices, customVariantPrices, hiddenVariants, combinations]);

  // Mutations
  const hideVariantMutation = useMutation({
    mutationFn: ({ variantId }: { variantId: string }) => hideVariantFromClient(clientId, variantId),
    onSuccess: () => {
      toast({ title: "Variante masquée" });
      refetchHiddenVariants();
    }
  });

  const showVariantMutation = useMutation({
    mutationFn: ({ variantId }: { variantId: string }) => showVariantForClient(clientId, variantId),
    onSuccess: () => {
      toast({ title: "Variante affichée" });
      refetchHiddenVariants();
    }
  });

  const deleteCustomVariantMutation = useMutation({
    mutationFn: deleteClientCustomVariant,
    onSuccess: () => {
      toast({ title: "Variante supprimée" });
      refetchCustomVariants();
    }
  });

  const generateCombinationsMutation = useMutation({
    mutationFn: async () => {
      const customAttributes: Record<string, string[]> = {};
      
      customVariants.forEach(variant => {
        Object.entries(variant.attributes).forEach(([key, value]) => {
          if (!customAttributes[key]) {
            customAttributes[key] = [];
          }
          
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

      const allCombinations = generateAllCombinations(productAttrs, customAttributes);
      
      if (allCombinations.length === 0) {
        throw new Error("Aucune combinaison possible à générer.");
      }

      await createAllCombinations(clientId, productId, allCombinations);
      return allCombinations.length;
    },
    onSuccess: (count) => {
      toast({
        title: "Combinaisons générées",
        description: `${count} combinaisons créées.`,
      });
      queryClient.invalidateQueries({
        queryKey: ['client-custom-variant-combinations', clientId, productId]
      });
    }
  });

  const updateCombinationMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      updateClientCustomVariantCombination(id, updates),
    onSuccess: () => {
      toast({ title: "Combinaison mise à jour" });
      queryClient.invalidateQueries({
        queryKey: ['client-custom-variant-combinations', clientId, productId]
      });
      setEditingCombination(null);
    }
  });

  const deleteCombinationMutation = useMutation({
    mutationFn: deleteClientCustomVariantCombination,
    onSuccess: () => {
      toast({ title: "Combinaison supprimée" });
      queryClient.invalidateQueries({
        queryKey: ['client-custom-variant-combinations', clientId, productId]
      });
    }
  });

  // Handlers
  const handleVariantSaved = () => {
    refetchCustomPrices();
    setEditingVariant(null);
  };

  const handleCustomVariantSaved = () => {
    refetchCustomVariants();
    setIsCreatingCustomVariant(false);
    setEditingCustomVariant(null);
  };

  const handleEditCombination = (combination: ClientCustomVariantCombination) => {
    setEditingCombination({
      id: combination.id,
      custom_purchase_price: combination.custom_purchase_price || undefined,
      custom_monthly_price: combination.custom_monthly_price || undefined,
      margin_rate: combination.margin_rate || undefined,
      notes: combination.notes || "",
      is_available: combination.is_available
    });
  };

  const handleSaveCombination = () => {
    if (!editingCombination) return;
    
    const { id, ...updates } = editingCombination;
    updateCombinationMutation.mutate({ id, updates });
  };

  const formatAttributes = (attributes: Record<string, any>) => {
    return Object.entries(attributes)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
  };

  if (variantsLoading || combinationsLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Gestion unifiée des prix des variantes</DialogTitle>
            <DialogDescription>Chargement...</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestion unifiée des prix des variantes</DialogTitle>
            <DialogDescription>
              Gérez tous les prix des variantes pour "{productName}" en un seul endroit
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="unified" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="unified">Vue unifiée</TabsTrigger>
              <TabsTrigger value="management">Gestion avancée</TabsTrigger>
            </TabsList>

            <TabsContent value="unified" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Toutes les combinaisons</h3>
                <div className="flex gap-2">
                  <Button
                    onClick={() => generateCombinationsMutation.mutate()}
                    disabled={generateCombinationsMutation.isPending}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Générer combinaisons
                  </Button>
                  <Button
                    onClick={() => setIsCreatingCustomVariant(true)}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Créer variante
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg">
                <div className="grid grid-cols-12 gap-4 p-3 bg-muted font-medium text-sm">
                  <div className="col-span-5">Attributs</div>
                  <div className="col-span-2">Prix standard</div>
                  <div className="col-span-2">Prix personnalisé</div>
                  <div className="col-span-1">Économie</div>
                  <div className="col-span-2">Actions</div>
                </div>

                <div className="divide-y">
                  {unifiedCombinations.map((item) => (
                    <div key={item.id} className={`grid grid-cols-12 gap-4 p-3 items-center ${item.isHidden ? 'opacity-50 bg-muted/30' : ''}`}>
                      <div className="col-span-5">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(item.attributes).map(([key, value]) => (
                            <Badge key={key} variant={item.type === 'standard' ? 'outline' : 'secondary'} className="text-xs">
                              {key}: {String(value)}
                            </Badge>
                          ))}
                        </div>
                        {item.type === 'combination' && (
                          <Badge variant="default" className="mt-1 text-xs">
                            Personnalisée
                          </Badge>
                        )}
                        {item.isHidden && (
                          <Badge variant="destructive" className="mt-1 text-xs">
                            Masquée
                          </Badge>
                        )}
                      </div>

                      <div className="col-span-2 text-sm">
                        {item.standardPrice ? formatCurrency(item.standardPrice) : "—"}
                      </div>

                      <div className="col-span-2">
                        {editingCombination?.id === item.id ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editingCombination.custom_monthly_price || ""}
                            onChange={(e) => setEditingCombination({
                              ...editingCombination,
                              custom_monthly_price: e.target.value ? parseFloat(e.target.value) : undefined
                            })}
                            className="text-sm"
                          />
                        ) : (
                          <div className="text-sm font-medium text-primary">
                            {item.customPrice ? formatCurrency(item.customPrice) : "—"}
                          </div>
                        )}
                      </div>

                      <div className="col-span-1 text-sm">
                        {item.savings > 0 ? (
                          <span className="text-green-600 font-medium">
                            {formatCurrency(item.savings)}
                          </span>
                        ) : "—"}
                      </div>

                      <div className="col-span-2 flex gap-1">
                        {editingCombination?.id === item.id ? (
                          <>
                            <Button size="sm" variant="outline" onClick={handleSaveCombination}>
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingCombination(null)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            {item.type === 'standard' ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingVariant(item.id)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                {!item.isHidden ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => hideVariantMutation.mutate({ variantId: item.id })}
                                  >
                                    <EyeOff className="h-3 w-3" />
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => showVariantMutation.mutate({ variantId: item.id })}
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                )
                                }
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => item.combination && handleEditCombination(item.combination)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => item.combination && deleteCombinationMutation.mutate(item.combination.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {unifiedCombinations.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    Aucune variante disponible. Créez des variantes personnalisées ou générez des combinaisons.
                  </div>
                )}
              </div>

              {editingCombination && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Édition de la combinaison</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Prix d'achat personnalisé</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editingCombination.custom_purchase_price || ""}
                          onChange={(e) => setEditingCombination({
                            ...editingCombination,
                            custom_purchase_price: e.target.value ? parseFloat(e.target.value) : undefined
                          })}
                        />
                      </div>
                      <div>
                        <Label>Taux de marge (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editingCombination.margin_rate || ""}
                          onChange={(e) => setEditingCombination({
                            ...editingCombination,
                            margin_rate: e.target.value ? parseFloat(e.target.value) : undefined
                          })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        value={editingCombination.notes || ""}
                        onChange={(e) => setEditingCombination({
                          ...editingCombination,
                          notes: e.target.value
                        })}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={editingCombination.is_available}
                        onCheckedChange={(checked) => setEditingCombination({
                          ...editingCombination,
                          is_available: checked
                        })}
                      />
                      <Label>Disponible</Label>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="management" className="space-y-6">
              {/* Section des variantes personnalisées */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Variantes personnalisées</h3>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreatingCustomVariant(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Créer une variante
                  </Button>
                </div>

                {customVariants.length > 0 ? (
                  <div className="space-y-2">
                    {customVariants.map((customVariant) => (
                      <Card key={customVariant.id} className="border-l-4 border-l-primary">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <CardTitle className="text-base">
                                {customVariant.variant_name}
                                <Badge variant="default" className="ml-2">
                                  Personnalisée
                                </Badge>
                              </CardTitle>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(customVariant.attributes).map(([key, value]) => (
                                  <Badge key={key} variant="outline">
                                    {key}: {String(value)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingCustomVariant(customVariant)}
                              >
                                <Pencil className="h-4 w-4" />
                                Modifier
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteCustomVariantMutation.mutate(customVariant.id)}
                                disabled={deleteCustomVariantMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Aucune variante personnalisée définie.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Modals */}
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

      {(isCreatingCustomVariant || editingCustomVariant) && (
        <ClientCustomVariantEditor
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setIsCreatingCustomVariant(false);
              setEditingCustomVariant(null);
            }
          }}
          clientId={clientId}
          productId={productId}
          productName={productName}
          variant={editingCustomVariant}
          onSuccess={handleCustomVariantSaved}
        />
      )}
    </>
  );
};
