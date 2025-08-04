import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProductVariantPrices } from "@/services/variantPriceService";
import { getClientCustomVariantPrices, hideVariantFromClient, showVariantForClient, getClientHiddenVariants } from "@/services/clientVariantPriceService";
import { getClientCustomVariants, deleteClientCustomVariant } from "@/services/clientCustomVariantService";
import { ClientVariantCustomPriceEditor } from "./ClientVariantCustomPriceEditor";
import ClientCustomVariantEditor from "./ClientCustomVariantEditor";
import { formatCurrency } from "@/lib/utils";
import { Pencil, Plus, Trash2, EyeOff, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [isCreatingCustomVariant, setIsCreatingCustomVariant] = useState(false);
  const [editingCustomVariant, setEditingCustomVariant] = useState<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Récupérer les variantes personnalisées
  const { data: customVariants, refetch: refetchCustomVariants } = useQuery({
    queryKey: ['client-custom-variants', clientId, productId],
    queryFn: () => getClientCustomVariants(clientId, productId),
    enabled: open && !!clientId && !!productId,
  });

  // Récupérer les variantes masquées
  const { data: hiddenVariants, refetch: refetchHiddenVariants } = useQuery({
    queryKey: ['client-hidden-variants', clientId],
    queryFn: () => getClientHiddenVariants(clientId),
    enabled: open && !!clientId,
  });

  const getCustomPriceForVariant = (variantId: string) => {
    return customVariantPrices?.find(cp => cp.variant_price_id === variantId);
  };

  // Mutations pour gérer la visibilité des variantes
  const hideVariantMutation = useMutation({
    mutationFn: ({ variantId }: { variantId: string }) => hideVariantFromClient(clientId, variantId),
    onSuccess: () => {
      toast({
        title: "Variante masquée",
        description: "La variante a été masquée du catalogue client.",
      });
      refetchHiddenVariants();
    },
    onError: (error) => {
      console.error("Error hiding variant:", error);
      toast({
        title: "Erreur",
        description: "Impossible de masquer la variante.",
        variant: "destructive",
      });
    },
  });

  const showVariantMutation = useMutation({
    mutationFn: ({ variantId }: { variantId: string }) => showVariantForClient(clientId, variantId),
    onSuccess: () => {
      toast({
        title: "Variante affichée",
        description: "La variante est maintenant visible dans le catalogue client.",
      });
      refetchHiddenVariants();
    },
    onError: (error) => {
      console.error("Error showing variant:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'afficher la variante.",
        variant: "destructive",
      });
    },
  });

  // Mutation pour supprimer une variante personnalisée
  const deleteCustomVariantMutation = useMutation({
    mutationFn: deleteClientCustomVariant,
    onSuccess: () => {
      toast({
        title: "Variante supprimée",
        description: "La variante personnalisée a été supprimée avec succès.",
      });
      refetchCustomVariants();
    },
    onError: (error) => {
      console.error("Error deleting custom variant:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la variante personnalisée.",
        variant: "destructive",
      });
    },
  });

  const handleVariantSaved = () => {
    refetchCustomPrices();
    setEditingVariant(null);
  };

  const handleCustomVariantSaved = () => {
    refetchCustomVariants();
    setIsCreatingCustomVariant(false);
    setEditingCustomVariant(null);
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

          <div className="space-y-6">
            {/* Section des variantes standard */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Variantes standard</h3>
              </div>
              
              {variantPrices
                .filter(variant => !hiddenVariants?.includes(variant.id))
                .map((variant) => {
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
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingVariant(variant.id)}
                            >
                              {hasCustomPrice ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                              {hasCustomPrice ? 'Modifier' : 'Ajouter prix'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => hideVariantMutation.mutate({ variantId: variant.id })}
                              disabled={hideVariantMutation.isPending}
                              title="Masquer du catalogue client"
                            >
                              <EyeOff className="h-4 w-4" />
                            </Button>
                          </div>
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

            {/* Section des variantes masquées */}
            {hiddenVariants && hiddenVariants.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-muted-foreground">Variantes masquées</h3>
                </div>
                
                {variantPrices
                  .filter(variant => hiddenVariants.includes(variant.id))
                  .map((variant) => {
                    const customPrice = getCustomPriceForVariant(variant.id);
                    const hasCustomPrice = !!customPrice;

                    return (
                      <Card key={variant.id} className="relative opacity-60 border-dashed">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <CardTitle className="text-base text-muted-foreground">
                                Variante (masquée)
                                {hasCustomPrice && (
                                  <Badge variant="outline" className="ml-2">
                                    Prix personnalisé
                                  </Badge>
                                )}
                              </CardTitle>
                              <div className="flex flex-wrap gap-2">
                                {variant.attributes && Object.entries(variant.attributes).map(([key, value]) => (
                                  <Badge key={key} variant="outline" className="opacity-60">
                                    {key}: {String(value)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => showVariantMutation.mutate({ variantId: variant.id })}
                              disabled={showVariantMutation.isPending}
                              title="Afficher dans le catalogue client"
                            >
                              <Eye className="h-4 w-4" />
                              Afficher
                            </Button>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="pt-0">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm opacity-60">
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
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}

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

              {customVariants && customVariants.length > 0 ? (
                customVariants.map((customVariant) => (
                  <Card key={customVariant.id} className="relative border-l-4 border-l-primary">
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
                    
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {customVariant.custom_purchase_price && (
                          <div>
                            <div className="font-medium text-muted-foreground">Prix d'achat</div>
                            <div className="text-lg font-semibold">
                              {formatCurrency(customVariant.custom_purchase_price)}
                            </div>
                          </div>
                        )}
                        
                        {customVariant.custom_monthly_price && (
                          <div>
                            <div className="font-medium text-muted-foreground">Prix mensuel</div>
                            <div className="text-lg font-semibold text-primary">
                              {formatCurrency(customVariant.custom_monthly_price)}/mois
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {customVariant.notes && (
                        <div className="mt-3 p-3 bg-muted rounded-md">
                          <div className="text-sm font-medium text-muted-foreground">Notes</div>
                          <div className="text-sm">{customVariant.notes}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
                  <p className="text-muted-foreground">
                    Aucune variante personnalisée créée pour ce client.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setIsCreatingCustomVariant(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Créer la première variante
                  </Button>
                </div>
              )}
            </div>
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

      {(isCreatingCustomVariant || editingCustomVariant) && (
        <ClientCustomVariantEditor
          open={isCreatingCustomVariant || !!editingCustomVariant}
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